/** Test support: an in-memory ACP client wired straight to the scripted agent, recording everything it sees. */
import { PROTOCOL_VERSION, RequestError, client, methods, type McpServer, type RequestPermissionRequest, type SessionNotification, type StopReason } from '@agentclientprotocol/sdk'
import { createScriptedAgent, type ScriptedAgent } from './agent.ts'
import { StepController } from './control.ts'
import { validateScript, type Script } from './script.ts'
import { ScriptHost } from './scriptHost.ts'

export type Update = SessionNotification['update']

/** One thing the agent did on the wire, in order. */
export type Seen = { kind: 'update'; update: Update } | { kind: 'request'; method: string; params: Record<string, unknown> }

export interface HarnessOptions {
  controller?: StepController
  /** The optionId to select for each permission request; `cancelled` answers with the cancelled outcome. */
  permission?: (request: RequestPermissionRequest) => string
  /** Files the client serves for fs/read_text_file, by path. */
  files?: Record<string, string>
  terminalOutput?: string
  terminalExitCode?: number
}

export class Harness {
  readonly seen: Seen[] = []
  readonly written: Array<{ path: string; content: string }> = []
  readonly controller: StepController
  private readonly scripted: ScriptedAgent
  private readonly host: ScriptHost
  private readonly connection: ReturnType<ReturnType<typeof client>['connect']>
  sessionId = ''

  constructor(script: Script, options: HarnessOptions = {}) {
    this.controller = options.controller ?? new StepController()
    this.host = new ScriptHost(script)
    this.scripted = createScriptedAgent(this.host, this.controller)
    const record = (method: string, params: object): void => void this.seen.push({ kind: 'request', method, params: params as Record<string, unknown> })
    const output = options.terminalOutput ?? 'terminal output'
    this.connection = client({ name: 'test-client' })
      .onNotification(methods.client.session.update, ({ params }) => void this.seen.push({ kind: 'update', update: params.update }))
      .onRequest(methods.client.session.requestPermission, ({ params }) => {
        record(methods.client.session.requestPermission, params)
        const key = options.permission?.(params) ?? params.options[0].optionId
        return { outcome: key === 'cancelled' ? { outcome: 'cancelled' as const } : { outcome: 'selected' as const, optionId: key } }
      })
      .onRequest(methods.client.fs.readTextFile, ({ params }) => {
        record(methods.client.fs.readTextFile, params)
        const content = options.files?.[params.path]
        if (content === undefined) throw RequestError.resourceNotFound(params.path)
        return { content }
      })
      .onRequest(methods.client.fs.writeTextFile, ({ params }) => {
        record(methods.client.fs.writeTextFile, params)
        this.written.push({ path: params.path, content: params.content })
        return {}
      })
      .onRequest(methods.client.terminal.create, ({ params }) => {
        record(methods.client.terminal.create, params)
        return { terminalId: 'term-1' }
      })
      .onRequest(methods.client.terminal.waitForExit, () => ({ exitCode: options.terminalExitCode ?? 0 }))
      .onRequest(methods.client.terminal.output, () => ({ output, truncated: false }))
      .onRequest(methods.client.terminal.kill, () => ({}))
      .onRequest(methods.client.terminal.release, () => ({}))
      .connect(this.scripted.app)
  }

  async start(cwd = '/work', mcpServers: McpServer[] = []): Promise<this> {
    await this.connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true } })
    const session = await this.connection.agent.request(methods.agent.session.new, { cwd, mcpServers })
    this.sessionId = session.sessionId
    return this
  }

  prompt(text: string, extraBlocks: Array<Record<string, unknown>> = []): Promise<StopReason> {
    const prompt = [...extraBlocks, { type: 'text', text }] as never
    return this.connection.agent.request(methods.agent.session.prompt, { sessionId: this.sessionId, prompt }).then((r) => r.stopReason)
  }

  cancel(): Promise<void> {
    return this.connection.agent.notify(methods.agent.session.cancel, { sessionId: this.sessionId })
  }

  loadScript(script: Script): void {
    this.host.replace(script)
  }

  /** The ordered trace, one short string per thing the agent did: `message:Hi`, `tool_call:edit-1`, `request:fs/write_text_file`. */
  trace(): string[] {
    return this.seen.filter((s) => !(s.kind === 'update' && s.update.sessionUpdate === 'available_commands_update')).map(describe)
  }

  updates<K extends Update['sessionUpdate']>(kind: K): Array<Extract<Update, { sessionUpdate: K }>> {
    return this.seen.flatMap((s) => (s.kind === 'update' && s.update.sessionUpdate === kind ? [s.update as Extract<Update, { sessionUpdate: K }>] : []))
  }

  async dispose(): Promise<void> {
    this.connection.close()
    await this.scripted.dispose()
  }
}

function describe(seen: Seen): string {
  if (seen.kind === 'request') return `request:${seen.method}`
  const u = seen.update
  switch (u.sessionUpdate) {
    case 'agent_message_chunk':
      return `message:${u.content.type === 'text' ? u.content.text : u.content.type}`
    case 'agent_thought_chunk':
      return `thought:${u.content.type === 'text' ? u.content.text : u.content.type}`
    case 'tool_call':
      return `tool_call:${u.toolCallId}:${u.status}`
    case 'tool_call_update':
      return `tool_call_update:${u.toolCallId}:${u.status ?? '-'}`
    default:
      return u.sessionUpdate
  }
}

export const script = (partial: Omit<Script, 'name' | 'agent'> & Partial<Pick<Script, 'name' | 'agent'>>): Script =>
  validateScript({ name: 'test', agent: { name: 'scripted-agent', version: '1.0.0' }, ...partial })

/** A unique control socket path (Unix socket, or a named pipe on Windows). */
export const socketPath = (): string => {
  const name = `a7-ctl-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
  return process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : `${process.env.TMPDIR ?? '/tmp'}/${name}.sock`
}
