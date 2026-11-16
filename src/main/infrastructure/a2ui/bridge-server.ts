import { createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import type { A2uiMessageSink } from '../../domain/a2ui/ports'
import { LineSplitter } from './ndjson'
import { ENV_SESSION_KEY, ENV_SOCKET, MCP_SERVER_NAME, type BridgeResponse } from './protocol'

/** Per-app IPC endpoint: unix socket under tmpdir, named pipe on Windows. */
export function defaultSocketPath(pid: number = process.pid, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? `\\\\.\\pipe\\agentxp-a2ui-${pid}` : join(tmpdir(), `agentxp-a2ui-${pid}.sock`)
}

const parseJson = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

/** Main-process end of the A2UI bridge: validates agent messages and hands them to the sink. */
export class A2uiBridgeServer {
  private server: Server | null = null
  private readonly sockets = new Set<Socket>()

  constructor(
    private readonly sink: A2uiMessageSink,
    readonly socketPath: string = defaultSocketPath(),
    private readonly validator: A2uiMessageValidator = new A2uiMessageValidator()
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
    return new Promise((resolve) => {
      server.close(() => {
        if (process.platform !== 'win32') rmSync(this.socketPath, { force: true })
        resolve()
      })
    })
  }

  private accept(socket: Socket): void {
    this.sockets.add(socket)
    socket.setEncoding('utf8')
    const splitter = new LineSplitter()
    socket.on('data', (chunk: string) =>
      splitter.push(chunk, (line) => {
        void this.handleLine(line).then((res) => {
          if (!socket.destroyed) socket.write(JSON.stringify(res) + '\n')
        })
      })
    )
    socket.on('close', () => this.sockets.delete(socket))
    socket.on('error', () => socket.destroy())
  }

  private async handleLine(line: string): Promise<BridgeResponse> {
    const req = parseJson(line)
    if (typeof req !== 'object' || req === null) return { id: '', ok: false, errors: ['request is not a JSON object'] }
    const { id, sessionKey, messages } = req as Record<string, unknown>
    const reqId = typeof id === 'string' ? id : ''
    if (typeof sessionKey !== 'string' || !sessionKey) return { id: reqId, ok: false, errors: ['missing sessionKey'] }
    const validated = this.validator.validate(messages)
    if (!validated.ok) return { id: reqId, ok: false, errors: validated.errors }
    try {
      const result = await this.sink.apply(sessionKey, validated.messages)
      return result.ok ? { id: reqId, ok: true } : { id: reqId, ok: false, errors: result.errors }
    } catch (e) {
      return { id: reqId, ok: false, errors: [e instanceof Error ? e.message : String(e)] }
    }
  }
}

export interface McpServerConfig {
  name: string
  command: string
  args: string[]
  env: { name: string; value: string }[]
}

/** ACP stdio McpServer entry for `session/new`'s `mcpServers`. */
export function buildA2uiMcpServerConfig(opts: {
  electronPath: string
  scriptPath: string
  socketPath: string
  sessionKey: string
}): McpServerConfig {
  return {
    name: MCP_SERVER_NAME,
    command: opts.electronPath,
    args: [opts.scriptPath],
    env: [
      { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
      { name: ENV_SOCKET, value: opts.socketPath },
      { name: ENV_SESSION_KEY, value: opts.sessionKey }
    ]
  }
}
