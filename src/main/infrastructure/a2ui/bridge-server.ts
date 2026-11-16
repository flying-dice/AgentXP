import { createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import type { ToolGroup } from '@shared/desktop'
import type { Id } from '@shared/models'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import type { DesktopToolHost, ToolResult } from '../../application/tools/types'
import type { A2uiMessageSink } from '../../domain/a2ui/ports'
import { LineSplitter } from './ndjson'
import { ENV_DESKTOP_ID, ENV_SESSION_KEY, ENV_SOCKET, MCP_SERVER_NAME, type BridgePush, type BridgeResponse } from './protocol'

/** Per-app IPC endpoint: unix socket under tmpdir, named pipe on Windows. */
export function defaultSocketPath(pid: number = process.pid, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? `\\\\.\\pipe\\agent7-a2ui-${pid}` : join(tmpdir(), `agent7-a2ui-${pid}.sock`)
}

const parseJson = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

const asId = (value: unknown): Id | null => {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(n) ? n : null
}

/** Sees the `a2ui_*` tool calls of the agents (the Event Viewer); the desktop tools are logged by `DesktopToolService`. */
export interface A2uiToolLog {
  called(sessionId: Id, tool: string, args: unknown): void
  finished(sessionId: Id, tool: string, result: ToolResult): void
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * Main-process end of the bridge to the agents' MCP child processes: validates and applies A2UI
 * messages, lists and runs the desktop tools, and pushes `toolsChanged` to the children of a desktop.
 */
export class A2uiBridgeServer {
  private server: Server | null = null
  private readonly sockets = new Set<Socket>()
  private readonly subscribers = new Map<Id, Set<Socket>>()
  private readonly lastGroups = new Map<Id, string>()

  constructor(
    private readonly sink: A2uiMessageSink,
    readonly socketPath: string = defaultSocketPath(),
    private readonly validator: A2uiMessageValidator = new A2uiMessageValidator(),
    private readonly tools?: DesktopToolHost,
    private readonly log?: A2uiToolLog
  ) {}

  start(): Promise<void> {
    if (this.server) return Promise.resolve()
    if (process.platform !== 'win32') rmSync(this.socketPath, { force: true })
    const server = createServer((socket) => this.accept(socket))
    this.server = server
    return new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.socketPath, () => {
        server.off('error', reject)
        resolve()
      })
    })
  }

  stop(): Promise<void> {
    const server = this.server
    if (!server) return Promise.resolve()
    this.server = null
    for (const s of this.sockets) s.destroy()
    this.subscribers.clear()
    return new Promise((resolve) => {
      server.close(() => {
        if (process.platform !== 'win32') rmSync(this.socketPath, { force: true })
        resolve()
      })
    })
  }

  /** Tells the MCP children of the desktop to refresh their tool list, when the enabled groups differ from what they last saw. */
  publishTools(desktopId: Id, groups: readonly ToolGroup[]): void {
    const key = groups.join(',')
    if (this.lastGroups.get(desktopId) === key) return
    this.lastGroups.set(desktopId, key)
    const push = JSON.stringify({ type: 'toolsChanged', groups: [...groups] } satisfies BridgePush) + '\n'
    for (const socket of this.subscribers.get(desktopId) ?? []) if (!socket.destroyed) socket.write(push)
  }

  /** How many MCP children listen for tool changes of the desktop. */
  subscriberCount(desktopId: Id): number {
    return this.subscribers.get(desktopId)?.size ?? 0
  }

  private accept(socket: Socket): void {
    this.sockets.add(socket)
    socket.setEncoding('utf8')
    const splitter = new LineSplitter()
    socket.on('data', (chunk: string) =>
      splitter.push(chunk, (line) => {
        void this.handleLine(line, socket).then((res) => {
          if (!socket.destroyed) socket.write(JSON.stringify(res) + '\n')
        })
      })
    )
    socket.on('close', () => {
      this.sockets.delete(socket)
      for (const set of this.subscribers.values()) set.delete(socket)
    })
    socket.on('error', () => socket.destroy())
  }

  private async handleLine(line: string, socket: Socket): Promise<BridgeResponse> {
    const req = parseJson(line)
    if (typeof req !== 'object' || req === null) return { id: '', ok: false, errors: ['request is not a JSON object'] }
    const request = req as Record<string, unknown>
    const id = typeof request['id'] === 'string' ? request['id'] : ''
    try {
      switch (request['type'] ?? 'a2ui') {
        case 'a2ui':
          return await this.a2ui(id, request)
        case 'tools':
          return this.listTools(id, request)
        case 'call':
          return await this.callTool(id, request)
        case 'log':
          return this.logTool(id, request)
        case 'subscribe':
          return this.subscribe(id, request, socket)
        default:
          return { id, ok: false, errors: [`unknown request type ${String(request['type'])}`] }
      }
    } catch (e) {
      return { id, ok: false, errors: [message(e)] }
    }
  }

  private async a2ui(id: string, { sessionKey, messages }: Record<string, unknown>): Promise<BridgeResponse> {
    if (typeof sessionKey !== 'string' || !sessionKey) return { id, ok: false, errors: ['missing sessionKey'] }
    const validated = this.validator.validate(messages)
    if (!validated.ok) return { id, ok: false, errors: validated.errors }
    const result = await this.sink.apply(sessionKey, validated.messages)
    return result.ok ? { id, ok: true } : { id, ok: false, errors: result.errors }
  }

  private listTools(id: string, { desktopId }: Record<string, unknown>): BridgeResponse {
    const desktop = asId(desktopId)
    const groups = this.tools && desktop !== null ? this.tools.enabledGroups(desktop) : []
    if (desktop !== null) this.lastGroups.set(desktop, groups.join(',')) // the baseline children work from
    return { id, ok: true, groups }
  }

  private async callTool(id: string, { sessionKey, desktopId, tool, args }: Record<string, unknown>): Promise<BridgeResponse> {
    const session = asId(sessionKey)
    const desktop = asId(desktopId)
    if (!this.tools) return { id, ok: false, errors: ['desktop tools are not available'] }
    if (session === null || desktop === null || typeof tool !== 'string') {
      return { id, ok: false, errors: ['This chat is not on a desktop, so desktop tools are unavailable.'] }
    }
    return { id, ok: true, result: await this.tools.call({ sessionId: session, desktopId: desktop }, tool, args) }
  }

  private logTool(id: string, { sessionKey, tool, phase, args, result }: Record<string, unknown>): BridgeResponse {
    const session = asId(sessionKey)
    if (session === null || typeof tool !== 'string' || !tool.startsWith('a2ui_')) return { id, ok: false, errors: ['invalid log request'] }
    if (phase === 'called') this.log?.called(session, tool, args)
    else if (phase === 'finished' && typeof result === 'object' && result !== null) this.log?.finished(session, tool, result as ToolResult)
    return { id, ok: true }
  }

  private subscribe(id: string, { desktopId }: Record<string, unknown>, socket: Socket): BridgeResponse {
    const desktop = asId(desktopId)
    if (desktop === null) return { id, ok: false, errors: ['missing desktopId'] }
    const set = this.subscribers.get(desktop) ?? new Set<Socket>()
    set.add(socket)
    this.subscribers.set(desktop, set)
    return { id, ok: true }
  }
}

export interface McpLaunch {
  electronPath: string
  scriptPath: string
  socketPath: string
  sessionKey: string
  desktopId?: string
}

/** ACP stdio McpServer entry for `session/new`'s `mcpServers`. */
export function buildA2uiMcpServerConfig(opts: McpLaunch): {
  name: string
  command: string
  args: string[]
  env: { name: string; value: string }[]
} {
  return {
    name: MCP_SERVER_NAME,
    command: opts.electronPath,
    args: [opts.scriptPath],
    env: [
      { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
      { name: ENV_SOCKET, value: opts.socketPath },
      { name: ENV_SESSION_KEY, value: opts.sessionKey },
      ...(opts.desktopId ? [{ name: ENV_DESKTOP_ID, value: opts.desktopId }] : [])
    ]
  }
}
