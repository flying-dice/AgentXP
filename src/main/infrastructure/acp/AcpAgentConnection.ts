import {
  PROTOCOL_VERSION,
  RequestError,
  client,
  methods,
  type ClientConnection,
  type McpServer,
  type PermissionOption,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type Stream
} from '@agentclientprotocol/sdk'
import type { ContentBlockDto, PermissionOptionDto } from '@shared/models'
import type { AgentSessionEventSink } from '../../domain/agent/AgentSessionEventSink'
import type { FileAccessProvider } from '../../domain/agent/FileAccess'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import type { PermissionDecision, PermissionPrompter } from '../../domain/agent/PermissionPrompter'
import { toAcpContentBlock } from './contentMapping'
import { mapSessionUpdate, toToolCallPatch } from './mapSessionUpdate'
import { extractSessionState, type SessionState } from './sessionState'
import type { TerminalManager } from './TerminalManager'

export interface AuthMethodInfo {
  id: string
  name: string
  description: string | null
}

export interface AgentInitInfo {
  agentName: string | null
  agentVersion: string | null
  canLoadSession: boolean
  authMethods: AuthMethodInfo[]
}

export interface NewSessionResult {
  acpSessionId: string
  modes: SessionState['modes']
  models: SessionState['models']
  currentModeId: string | null
  currentModelId: string | null
}

export type LoadSessionResult = Omit<NewSessionResult, 'acpSessionId'>

export type StopReason = 'end_turn' | 'max_tokens' | 'max_turn_requests' | 'refusal' | 'cancelled'

export interface AcpAgentConnectionDeps {
  stream: Stream
  sink: AgentSessionEventSink
  permissions: PermissionPrompter
  files: FileAccessProvider
  terminals: TerminalManager
  clientName?: string
  clientVersion?: string
}

/** Thrown when the agent needs the user to sign in before it can open a session. */
export class AgentAuthRequiredError extends Error {
  constructor(readonly authMethods: AuthMethodInfo[]) {
    const names = authMethods.map((m) => m.name).join(', ')
    super(
      `The agent requires authentication${names ? ` (${names})` : ''}. ` +
        'Sign in with the agent\'s own tooling (for Claude Code run "claude" and use /login), then try again.'
    )
    this.name = 'AgentAuthRequiredError'
  }
}

const AUTH_REQUIRED_CODE = -32000

const toMcpServer = (config: McpServerConfig): McpServer =>
  config.kind === 'stdio'
    ? {
        name: config.name,
        command: config.command,
        args: config.args,
        env: Object.entries(config.env).map(([name, value]) => ({ name, value }))
      }
    : {
        type: 'http',
        name: config.name,
        url: config.url,
        headers: Object.entries(config.headers).map(([name, value]) => ({ name, value }))
      }

const toOptionDto = (o: PermissionOption): PermissionOptionDto => ({ optionId: o.optionId, name: o.name, kind: o.kind })

/** The client side of one ACP connection (one per agent process). */
export class AcpAgentConnection {
  private readonly connection: ClientConnection
  private init: AgentInitInfo | null = null
  private readonly modelConfigIds = new Map<string, string>()
  private readonly permissionAborts = new Map<string, Set<AbortController>>()

  constructor(private readonly deps: AcpAgentConnectionDeps) {
    this.connection = this.buildApp().connect(deps.stream)
  }

  /** Resolves when the connection to the agent has closed. */
  get closed(): Promise<void> {
    return this.connection.closed
  }

  async initialize(): Promise<AgentInitInfo> {
    const response = await this.connection.agent.request(methods.agent.initialize, {
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true },
      clientInfo: { name: this.deps.clientName ?? 'agentxp', version: this.deps.clientVersion ?? '0.1.0' }
    })
    this.init = {
      agentName: response.agentInfo?.name ?? null,
      agentVersion: response.agentInfo?.version ?? null,
      canLoadSession: response.agentCapabilities?.loadSession === true,
      authMethods: (response.authMethods ?? []).map((m) => ({ id: m.id, name: m.name, description: m.description ?? null }))
    }
    return this.init
  }

  async authenticate(methodId: string): Promise<void> {
    await this.connection.agent.request(methods.agent.authenticate, { methodId })
  }

  async newSession(cwd: string, mcpServers: McpServerConfig[] = []): Promise<NewSessionResult> {
    const response = await this.withAuthCheck(() =>
      this.connection.agent.request(methods.agent.session.new, { cwd, mcpServers: mcpServers.map(toMcpServer) })
    )
    return { acpSessionId: response.sessionId, ...this.rememberState(response.sessionId, response) }
  }

  /** Replays history as session updates, then resolves. Needs the `loadSession` capability. */
  async loadSession(acpSessionId: string, cwd: string, mcpServers: McpServerConfig[] = []): Promise<LoadSessionResult> {
    if (!this.init?.canLoadSession) throw new Error('The agent does not support loading sessions')
    const response = await this.withAuthCheck(() =>
      this.connection.agent.request(methods.agent.session.load, {
        sessionId: acpSessionId,
        cwd,
        mcpServers: mcpServers.map(toMcpServer)
      })
    )
    return this.rememberState(acpSessionId, response ?? {})
  }

  async prompt(acpSessionId: string, blocks: ContentBlockDto[]): Promise<StopReason> {
    const response = await this.connection.agent.request(methods.agent.session.prompt, {
      sessionId: acpSessionId,
      prompt: blocks.map(toAcpContentBlock)
    })
    return response.stopReason
  }

  /** Cancels the running turn and dismisses pending permission prompts. */
  async cancel(acpSessionId: string): Promise<void> {
    this.permissionAborts.get(acpSessionId)?.forEach((c) => c.abort())
    await this.connection.agent.notify(methods.agent.session.cancel, { sessionId: acpSessionId })
  }

  async setMode(acpSessionId: string, modeId: string): Promise<void> {
    await this.connection.agent.request(methods.agent.session.setMode, { sessionId: acpSessionId, modeId })
  }

  /** Uses the model config option when advertised, else the legacy `session/set_model`. */
  async setModel(acpSessionId: string, modelId: string): Promise<void> {
    const configId = this.modelConfigIds.get(acpSessionId)
    if (configId) {
      await this.connection.agent.request(methods.agent.session.setConfigOption, {
        sessionId: acpSessionId,
        configId,
        value: modelId
      })
      return
    }
    await this.connection.agent.request('session/set_model', { sessionId: acpSessionId, modelId })
  }

  dispose(): void {
    this.permissionAborts.forEach((set) => set.forEach((c) => c.abort()))
    this.connection.close()
  }

  private rememberState(
    acpSessionId: string,
    response: Parameters<typeof extractSessionState>[0]
  ): LoadSessionResult {
    const { modelConfigId, ...state } = extractSessionState(response)
    if (modelConfigId) this.modelConfigIds.set(acpSessionId, modelConfigId)
    return state
  }

  private async withAuthCheck<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof RequestError && error.code === AUTH_REQUIRED_CODE) {
        throw new AgentAuthRequiredError(this.init?.authMethods ?? [])
      }
      throw error
    }
  }

  private buildApp(): ReturnType<typeof client> {
    const { files, terminals } = this.deps
    return client({ name: 'agentxp' })
      .onNotification(methods.client.session.update, ({ params }) => this.handleUpdate(params))
      .onRequest(methods.client.session.requestPermission, ({ params }) => this.handlePermission(params))
      .onRequest(methods.client.fs.readTextFile, ({ params }) =>
        guard(async () => ({
          content: await files.forSession(params.sessionId).readTextFile(params.path, params.line ?? undefined, params.limit ?? undefined)
        }))
      )
      .onRequest(methods.client.fs.writeTextFile, ({ params }) =>
        guard(async () => {
          await files.forSession(params.sessionId).writeTextFile(params.path, params.content)
          return {}
        })
      )
      .onRequest(methods.client.terminal.create, ({ params }) =>
        guard(async () => ({
          terminalId: terminals.create(params.sessionId, {
            command: params.command,
            args: params.args,
            cwd: params.cwd ?? undefined,
            env: Object.fromEntries((params.env ?? []).map((e) => [e.name, e.value])),
            outputByteLimit: params.outputByteLimit ?? undefined
          })
        }))
      )
      .onRequest(methods.client.terminal.output, ({ params }) =>
        guard(async () => terminals.output(params.terminalId))
      )
      .onRequest(methods.client.terminal.waitForExit, ({ params }) =>
        guard(() => terminals.waitForExit(params.terminalId))
      )
      .onRequest(methods.client.terminal.kill, ({ params }) =>
        guard(async () => {
          await terminals.kill(params.terminalId)
          return {}
        })
      )
      .onRequest(methods.client.terminal.release, ({ params }) =>
        guard(async () => {
          await terminals.release(params.terminalId)
          return {}
        })
      )
  }

  private handleUpdate(notification: SessionNotification): void {
    const event = mapSessionUpdate(notification.update)
    if (event) this.deps.sink.emit(notification.sessionId, event)
  }

  private async handlePermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    const abort = this.trackPermission(params.sessionId)
    try {
      const decision = await Promise.race([
        this.deps.permissions.prompt({
          sessionKey: params.sessionId,
          toolCallId: params.toolCall.toolCallId,
          toolCall: toToolCallPatch(params.toolCall),
          options: params.options.map(toOptionDto),
          signal: abort.signal
        }),
        whenAborted(abort.signal)
      ])
      return { outcome: abort.signal.aborted ? { outcome: 'cancelled' } : toOutcome(decision) }
    } finally {
      this.permissionAborts.get(params.sessionId)?.delete(abort)
    }
  }

  private trackPermission(sessionId: string): AbortController {
    const abort = new AbortController()
    const set = this.permissionAborts.get(sessionId) ?? new Set<AbortController>()
    set.add(abort)
    this.permissionAborts.set(sessionId, set)
    return abort
  }
}

const whenAborted = (signal: AbortSignal): Promise<PermissionDecision> =>
  new Promise((resolve) => {
    if (signal.aborted) resolve({ outcome: 'cancelled' })
    else signal.addEventListener('abort', () => resolve({ outcome: 'cancelled' }), { once: true })
  })

const toOutcome = (decision: PermissionDecision): RequestPermissionResponse['outcome'] =>
  decision.outcome === 'selected' ? { outcome: 'selected', optionId: decision.optionId } : { outcome: 'cancelled' }

/** Runs a client-side handler, turning plain errors into JSON-RPC errors. */
async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof RequestError) throw error
    if (isNodeError(error) && error.code === 'ENOENT') throw RequestError.resourceNotFound(error.path)
    throw RequestError.internalError(undefined, error instanceof Error ? error.message : String(error))
  }
}

const isNodeError = (e: unknown): e is NodeJS.ErrnoException => e instanceof Error && 'code' in e
