/**
 * Tiny client of the scripted agent's control socket (see README), for Playwright/vitest e2e tests:
 *
 *   const control = await connect(process.env.AGENT7_SCRIPT_CONTROL!)
 *   await control.setMode('manual')
 *   ...send a prompt in the UI...
 *   const paused = await control.waitForPause()   // { stepIndex: 0, label: '...' }
 *   await control.next()
 */
import { connect as netConnect, type Socket } from 'node:net'
import type { StepMode } from './script.ts'
import type { ControlEvent, Status } from './control.ts'

export type { ControlEvent, Status }
export type Reply = Status & { ok: boolean; cmd?: string; released?: boolean; error?: string }

interface Pending {
  resolve(reply: Reply): void
  reject(error: Error): void
}

export class ControlClient {
  readonly events: ControlEvent[] = []
  private readonly socket: Socket
  private readonly pending: Pending[] = []
  private readonly watchers = new Set<(event: ControlEvent) => void>()
  private buffer = ''

  constructor(socket: Socket) {
    this.socket = socket
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => this.onData(chunk))
    socket.on('close', () => this.pending.splice(0).forEach((p) => p.reject(new Error('control socket closed'))))
  }

  /** Replies come in request order; pushed events carry an `event` field. */
  private onData(chunk: string): void {
    this.buffer += chunk
    let newline: number
    while ((newline = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newline).trim()
      this.buffer = this.buffer.slice(newline + 1)
      if (!line) continue
      const message = JSON.parse(line) as Reply | ControlEvent
      if ('event' in message) {
        this.events.push(message)
        this.watchers.forEach((w) => w(message))
      } else {
        const waiting = this.pending.shift()
        if (message.ok) waiting?.resolve(message)
        else waiting?.reject(new Error(message.error ?? 'control command failed'))
      }
    }
  }

  /** Sends a raw command object; resolves with the reply, rejects on `ok: false`. */
  send(message: object): Promise<Reply> {
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject })
      this.socket.write(`${JSON.stringify(message)}\n`)
    })
  }

  status(): Promise<Status> {
    return this.send({ cmd: 'status' })
  }

  /** Releases the paused step. `released` is false when nothing was paused. */
  async next(): Promise<boolean> {
    return (await this.send({ cmd: 'next' })).released === true
  }

  /** `auto`/`manual` force every step; `script` hands control back to the per-step settings. */
  setMode(mode: StepMode | 'script'): Promise<Status> {
    return this.send({ cmd: mode })
  }

  load(path: string): Promise<Status> {
    return this.send({ cmd: 'load', path })
  }

  /** Resolves with the next pushed event of this kind; `signal` abandons the wait (the promise then never settles). */
  waitForEvent<K extends ControlEvent['event']>(kind: K, timeoutMs = 10_000, signal?: AbortSignal): Promise<Extract<ControlEvent, { event: K }>> {
    return new Promise((resolve, reject) => {
      const done = (): void => {
        clearTimeout(timer)
        this.watchers.delete(watcher)
      }
      const timer = setTimeout(() => {
        done()
        reject(new Error(`timed out after ${timeoutMs}ms waiting for control event "${kind}"`))
      }, timeoutMs)
      const watcher = (event: ControlEvent): void => {
        if (event.event !== kind) return
        done()
        resolve(event as Extract<ControlEvent, { event: K }>)
      }
      this.watchers.add(watcher)
      signal?.addEventListener('abort', done, { once: true })
    })
  }

  /** Resolves when a turn is paused before a manual step. Already paused: answers from the status. */
  async waitForPause(timeoutMs = 10_000): Promise<Status> {
    const abandon = new AbortController()
    const next = this.waitForEvent('paused', timeoutMs, abandon.signal)
    const now = await this.status()
    if (now.state !== 'paused') return next
    abandon.abort()
    return now
  }

  close(): void {
    this.socket.destroy()
  }
}

/** Connects to the Unix socket path or Windows named pipe the agent listens on (`AGENT7_SCRIPT_CONTROL`). */
export function connect(path: string): Promise<ControlClient> {
  return new Promise((resolve, reject) => {
    const socket = netConnect(path)
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.off('error', reject)
      resolve(new ControlClient(socket))
    })
  })
}
