/**
 * Step control: decides whether a step waits for `next` (StepController) and lets test code drive that over a
 * local socket (ControlServer, newline-delimited JSON).
 */
import { existsSync, unlinkSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import type { StepMode, StopReason } from './script.ts'

export type RunState = 'idle' | 'running' | 'paused'

/** Where the runner is: the step it waits before or executes. */
export interface Position {
  rule: string | null
  /** Index in the step list being run (top level or a permission branch). */
  stepIndex: number
  /** `3` for a top-level step, `3/allow/0` for the first step of the `allow` branch of step 3. */
  path: string
  stepType: string
  label: string | null
}

export interface Status {
  state: RunState
  /** `auto`/`manual` when forced by /auto, /manual or the control socket; `script` when each step decides. */
  mode: StepMode | 'script'
  rule: string | null
  stepIndex: number | null
  path: string | null
  stepType: string | null
  label: string | null
  script: string
}

export type ControlEvent =
  | ({ event: 'paused' | 'resumed' | 'turn_started' | 'mode' } & Status)
  | ({ event: 'turn_ended'; stopReason: StopReason | 'error' } & Status)

type Listener = (event: ControlEvent) => void

interface Waiter {
  release(): void
}

export class StepController {
  private override: StepMode | null = null
  private running = 0
  private position: Position | null = null
  private scriptName = ''
  private readonly waiters: Waiter[] = []
  private readonly listeners = new Set<Listener>()

  setScriptName(name: string): void {
    this.scriptName = name
  }

  status(): Status {
    const p = this.position
    const state: RunState = this.waiters.length > 0 ? 'paused' : this.running > 0 ? 'running' : 'idle'
    return {
      state,
      mode: this.override ?? 'script',
      rule: p?.rule ?? null,
      stepIndex: p?.stepIndex ?? null,
      path: p?.path ?? null,
      stepType: p?.stepType ?? null,
      label: p?.label ?? null,
      script: this.scriptName
    }
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** `auto`/`manual` force every step (and release a pause for `auto`); null gives control back to the script. */
  setMode(mode: StepMode | null): void {
    this.override = mode
    this.emit({ event: 'mode', ...this.status() })
    if (mode === 'auto') while (this.next());
  }

  /** Releases the oldest paused turn; false when nothing is paused (there is no credit for later). */
  next(): boolean {
    const waiter = this.waiters.shift()
    waiter?.release()
    return waiter !== undefined
  }

  turnStarted(rule: string | null): void {
    this.running++
    this.position = { rule, stepIndex: 0, path: '0', stepType: '', label: null }
    this.emit({ event: 'turn_started', ...this.status() })
  }

  turnEnded(stopReason: StopReason | 'error'): void {
    this.running = Math.max(0, this.running - 1)
    this.emit({ event: 'turn_ended', stopReason, ...this.status() })
  }

  /** Called before every step: records the position and waits for `next` when the step is manual. */
  async beforeStep(position: Position, stepMode: StepMode, signal: AbortSignal, announce?: () => Promise<void>): Promise<void> {
    this.position = position
    if ((this.override ?? stepMode) !== 'manual' || signal.aborted) return
    await new Promise<void>((resolve) => {
      const waiter: Waiter = { release: resolve }
      this.waiters.push(waiter)
      const onAbort = (): void => {
        const i = this.waiters.indexOf(waiter)
        if (i >= 0) this.waiters.splice(i, 1)
        resolve()
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.emit({ event: 'paused', ...this.status() })
      void announce?.().catch(() => undefined)
    })
    this.emit({ event: 'resumed', ...this.status() })
  }

  private emit(event: ControlEvent): void {
    for (const listener of this.listeners) listener(event)
  }
}

export interface ControlHooks {
  /** Replaces the script for future turns; throws with a readable message when it is invalid. */
  load(path: string): void
}

/** Newline-delimited JSON over a Unix socket or Windows named pipe. See README "Control socket". */
export class ControlServer {
  private readonly controller: StepController
  private readonly hooks: ControlHooks
  private readonly server: Server
  private readonly sockets = new Set<Socket>()
  private unsubscribe: (() => void) | null = null

  constructor(controller: StepController, hooks: ControlHooks) {
    this.controller = controller
    this.hooks = hooks
    this.server = createServer((socket) => this.accept(socket))
  }

  async listen(path: string): Promise<void> {
    if (process.platform !== 'win32' && existsSync(path)) unlinkSync(path)
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(path, () => {
        this.server.off('error', reject)
        resolve()
      })
    })
    this.unsubscribe = this.controller.onEvent((event) => this.broadcast(event))
  }

  async close(): Promise<void> {
    this.unsubscribe?.()
    for (const socket of this.sockets) socket.destroy()
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }

  private accept(socket: Socket): void {
    this.sockets.add(socket)
    socket.setEncoding('utf8')
    let buffer = ''
    socket.on('data', (chunk: string) => {
      buffer += chunk
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) this.reply(socket, line)
      }
    })
    socket.on('close', () => this.sockets.delete(socket))
    socket.on('error', () => this.sockets.delete(socket))
  }

  private reply(socket: Socket, line: string): void {
    let request: { cmd?: unknown; id?: unknown; path?: unknown }
    try {
      request = JSON.parse(line) as typeof request
    } catch {
      return this.send(socket, { ok: false, error: 'invalid JSON' })
    }
    const id = request.id
    try {
      const extra = this.execute(request.cmd, request.path)
      this.send(socket, { ok: true, cmd: request.cmd, ...(id === undefined ? {} : { id }), ...extra, ...this.controller.status() })
    } catch (error) {
      this.send(socket, { ok: false, cmd: request.cmd, ...(id === undefined ? {} : { id }), error: error instanceof Error ? error.message : String(error) })
    }
  }

  private execute(cmd: unknown, path: unknown): Record<string, unknown> {
    switch (cmd) {
      case 'next':
        return { released: this.controller.next() }
      case 'auto':
      case 'manual':
        this.controller.setMode(cmd)
        return {}
      case 'script':
        this.controller.setMode(null)
        return {}
      case 'status':
        return {}
      case 'load':
        if (typeof path !== 'string' || path === '') throw new Error('load needs a "path"')
        this.hooks.load(path)
        return {}
      default:
        throw new Error(`unknown cmd ${JSON.stringify(cmd)} (next, auto, manual, script, status, load)`)
    }
  }

  private send(socket: Socket, message: object): void {
    if (!socket.destroyed) socket.write(`${JSON.stringify(message)}\n`)
  }

  private broadcast(event: ControlEvent): void {
    for (const socket of this.sockets) this.send(socket, event)
  }
}
