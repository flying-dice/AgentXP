import { connect, type Socket } from 'node:net'
import { randomUUID } from 'node:crypto'
import type { ToolGroup } from '@shared/desktop'
import type { ToolResult } from '../../application/tools/types'
import { LineSplitter } from './ndjson'
import type { BridgePush, BridgeRequest, BridgeResponse } from './protocol'

/** What the MCP child needs from the app. */
export interface BridgeClient {
  forward(messages: unknown[], target?: string): Promise<BridgeResponse>
  /** The tool groups enabled on this chat's desktop right now. */
  tools(): Promise<ToolGroup[]>
  call(tool: string, args: unknown): Promise<ToolResult>
  /** Tells the app about an `a2ui_*` tool call and its result so the protocol event log shows it. Best effort. */
  logCalled(tool: string, args: unknown): Promise<void>
  logFinished(tool: string, result: ToolResult): Promise<void>
  /** Calls `listener` whenever the app says the tool list changed. Best effort: needs the app to be reachable. */
  onToolsChanged(listener: () => void): void
  close(): void
}

const parseLine = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

/** Talks to the app over its local socket: one connection per request, plus one long-lived subscription. */
export class SocketBridgeClient implements BridgeClient {
  private subscription: Socket | null = null

  constructor(
    private readonly socketPath: string,
    private readonly sessionKey: string,
    private readonly desktopId: string = '',
    private readonly timeoutMs = 10_000
  ) {}

  forward(messages: unknown[], target?: string): Promise<BridgeResponse> {
    return this.request({ type: 'a2ui', id: randomUUID(), sessionKey: this.sessionKey, messages, ...(target === undefined ? {} : { target }) }, this.timeoutMs)
  }

  async tools(): Promise<ToolGroup[]> {
    const res = await this.request({ type: 'tools', id: randomUUID(), desktopId: this.desktopId }, this.timeoutMs)
    return res.ok ? (res.groups ?? []) : []
  }

  async call(tool: string, args: unknown): Promise<ToolResult> {
    // No timeout: a call may wait for the user (permission) or a page load.
    const res = await this.request({ type: 'call', id: randomUUID(), sessionKey: this.sessionKey, desktopId: this.desktopId, tool, args }, 0)
    if (res.ok && res.result) return res.result
    return { content: [{ type: 'text', text: res.errors?.join('\n') ?? 'unknown error' }], isError: true }
  }

  async logCalled(tool: string, args: unknown): Promise<void> {
    await this.request({ type: 'log', id: randomUUID(), sessionKey: this.sessionKey, tool, phase: 'called', args }, this.timeoutMs)
  }

  async logFinished(tool: string, result: ToolResult): Promise<void> {
    await this.request({ type: 'log', id: randomUUID(), sessionKey: this.sessionKey, tool, phase: 'finished', result }, this.timeoutMs)
  }

  onToolsChanged(listener: () => void): void {
    if (this.subscription || !this.desktopId) return
    const socket = connect(this.socketPath)
    this.subscription = socket
    socket.unref() // never keeps the MCP child alive
    socket.setEncoding('utf8')
    const splitter = new LineSplitter()
    socket.on('connect', () => socket.write(JSON.stringify({ type: 'subscribe', id: randomUUID(), desktopId: this.desktopId } satisfies BridgeRequest) + '\n'))
    socket.on('data', (chunk: string) =>
      splitter.push(chunk, (line) => {
        const message = parseLine(line) as Partial<BridgePush> | undefined
        if (message?.type === 'toolsChanged') listener()
      })
    )
    socket.on('error', () => socket.destroy())
  }

  close(): void {
    this.subscription?.destroy()
    this.subscription = null
  }

  private request(request: BridgeRequest, timeoutMs: number): Promise<BridgeResponse> {
    return new Promise((resolve) => {
      const fail = (error: string): void => {
        socket.destroy()
        resolve({ id: request.id, ok: false, errors: [error] })
      }
      const socket = connect(this.socketPath)
      const splitter = new LineSplitter()
      socket.setEncoding('utf8')
      if (timeoutMs > 0) socket.setTimeout(timeoutMs, () => fail('timed out waiting for Agent7'))
      socket.on('connect', () => socket.write(JSON.stringify(request) + '\n'))
      socket.on('data', (chunk: string) =>
        splitter.push(chunk, (line) => {
          const res = parseLine(line) as BridgeResponse | undefined
          if (!res) return fail('invalid response from Agent7')
          socket.end()
          resolve(res)
        })
      )
      socket.on('error', (e) => fail(`cannot reach Agent7: ${e.message}`))
    })
  }
}
