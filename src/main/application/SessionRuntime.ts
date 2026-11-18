import type { AgentDto, Id, SessionDto, SessionStatus } from '@shared/models'
import type { McpServerConfig } from '../domain/agent/McpServerConfig'
import type { AgentSessionEvent } from '../domain/agent/AgentSessionEvent'
import type { AgentSessionEventSink } from '../domain/agent/AgentSessionEventSink'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { startFailure, stoppedUnexpectedly } from './agentProblems'
import type { AgentConnectionPool, LiveSession } from './AgentConnectionPool'
import { AppError, required } from './errors'
import type { A2uiMcpConfigFactory, AcpSessionState, AgentConnector, LiveAgentConnection, OpenedAcpSession, ProtocolTap } from './ports'
import type { ToolGate } from '../domain/agent/ToolGate'
import type { PermissionBroker } from './PermissionBroker'
import type { SessionBroadcaster } from './SessionBroadcaster'
import type { SessionProblems } from './SessionProblems'
import type { SessionEventBus } from './SessionEventBus'
import type { TerminalRecorder } from './TerminalRecorder'
import type { SessionFiles } from './SessionFiles'
import type { VirtualFileSystem } from './vfs/VirtualFileSystem'
import { NOT_ALLOWED_IN_REVIEW, readOnlyGate, readOnlyPrompter } from './review/reviewReadOnly'

const isBusy = (status: SessionStatus | undefined): boolean => status === 'working' || status === 'awaiting_permission'

/** Drops events while closed: `session/load` replays history we already persisted. */
class MutableSink implements AgentSessionEventSink {
  muted = false
  constructor(private readonly inner: AgentSessionEventSink) {}
  emit(sessionKey: string, event: AgentSessionEvent): void {
    if (!this.muted) this.inner.emit(sessionKey, event)
  }
}

export interface RuntimeDeps {
  connector: AgentConnector
  pool: AgentConnectionPool
  sessions: SessionRepository
  agents: AgentRepository
  vfs: Pick<VirtualFileSystem, 'realPath'>
  events: SessionEventBus
  broker: PermissionBroker
  files: SessionFiles
  terminals: TerminalRecorder
  broadcaster: SessionBroadcaster
  /** Where a failed start or a dropped connection is recorded for the UI (plain words for the user). */
  problems?: SessionProblems
  a2uiMcpConfig: A2uiMcpConfigFactory
  /** More MCP servers for a session next to the A2UI one: the ones the user installed (see `AgentCapabilities`). */
  extraMcpServers?: (sessionId: Id) => McpServerConfig[]
  /** Appended to the agent's system prompt for a session (how to work on the desktop); null for none. */
  systemPrompt?: (sessionId: Id) => string | null
  /** Gate for the client-side fs and terminal requests of a session. */
  toolGate(sessionId: Id): ToolGate
  /** Taps the protocol traffic of a session's agent connection (Event Viewer). */
  protocolTap?(sessionId: Id): ProtocolTap
}

/** Brings a session's agent online (also after an app restart) and keeps the session row in sync. */
export class SessionRuntime {
  private readonly connecting = new Map<Id, Promise<LiveSession>>()
  /** Chats whose agent started a fresh ACP session in place of their old one (it remembers nothing of the chat yet). */
  private readonly forgotten = new Set<Id>()

  constructor(private readonly deps: RuntimeDeps) {}

  /**
   * True once after the chat's agent came back without its memory of the chat (it cannot load the old ACP session, or
   * no longer has it): the next turn tells the agent the conversation so far (see `SessionService.runTurn`).
   */
  takeForgotten(sessionId: Id): boolean {
    return this.forgotten.delete(sessionId)
  }

  /** The live connection of the session, connecting (or reconnecting) when needed. */
  ensureConnected(sessionId: Id): Promise<LiveSession> {
    const live = this.deps.pool.get(sessionId)
    if (live) return Promise.resolve(live)
    const inFlight = this.connecting.get(sessionId)
    if (inFlight) return inFlight
    const attempt = this.connect(sessionId).finally(() => this.connecting.delete(sessionId))
    this.connecting.set(sessionId, attempt)
    return attempt
  }

  private async connect(sessionId: Id): Promise<LiveSession> {
    const { sessions, broadcaster, pool } = this.deps
    const session = required(sessions.get(sessionId), 'Session')
    const agent = required(this.deps.agents.get(session.agentId), 'Agent')
    broadcaster.setStatus(sessionId, 'connecting')
    const sink = new MutableSink(this.deps.events.forSession(sessionId))
    try {
      // The agent's cwd is the real folder behind the chat's working directory; an ejected drive refuses here.
      const cwd = await this.deps.vfs.realPath(this.desktopOf(session), session.cwd)
      const connection = await this.openConnection(agent, cwd, sessionId, sink)
      const live = await this.openSession(connection, session, cwd, sink, agent.defaultModeId, agent.defaultModelId)
      if (!sessions.get(sessionId)) {
        // The chat was deleted while its agent was starting (it starts in the background): nobody wants this agent.
        await connection.dispose()
        throw new AppError('The chat was removed.')
      }
      pool.add(sessionId, live)
      // A start that worked clears the problem, not the count of failures: only an answered turn does (see `SessionService.runTurn`).
      this.deps.problems?.clear(sessionId)
      broadcaster.setStatus(sessionId, 'idle')
      void connection.closed.then(() => this.onClosed(sessionId, connection))
      return live
    } catch (error) {
      if (sessions.get(sessionId)) {
        this.deps.problems?.set(sessionId, startFailure(error, agent))
        broadcaster.setStatus(sessionId, 'error')
      }
      throw error
    }
  }

  private openConnection(agent: AgentDto, cwd: string, sessionId: Id, sink: AgentSessionEventSink): Promise<LiveAgentConnection> {
    const { broker, files, terminals } = this.deps
    // The reviewer of a Code Review window only reads: writes are refused, not asked (UX-37).
    const review = this.deps.sessions.get(sessionId)?.role === 'review'
    const gate = this.deps.toolGate(sessionId)
    return this.deps.connector.open({
      agent,
      cwd,
      handlers: {
        sink,
        permissions: review
          ? readOnlyPrompter(broker.forSession(sessionId), (request) =>
              sink.emit(request.sessionKey, { type: 'tool_call_updated', toolCallId: request.toolCallId, patch: { status: 'failed', rawOutput: NOT_ALLOWED_IN_REVIEW } })
            )
          : broker.forSession(sessionId),
        gate: review ? readOnlyGate(gate) : gate,
        tap: this.deps.protocolTap?.(sessionId),
        files: files.forSession(sessionId),
        onTerminalActivity: (activity) => terminals.record(sessionId, activity)
      }
    })
  }

  /** Resumes the persisted ACP session when possible, otherwise starts a fresh one. */
  private async openSession(
    connection: LiveAgentConnection,
    session: SessionDto,
    cwd: string,
    sink: MutableSink,
    defaultModeId: string | null,
    defaultModelId: string | null
  ): Promise<LiveSession> {
    const mcpServers = [this.deps.a2uiMcpConfig(session.id), ...(this.deps.extraMcpServers?.(session.id) ?? [])]
    const systemPrompt = this.deps.systemPrompt?.(session.id) ?? null
    try {
      if (session.acpSessionId && connection.canLoadSession) {
        const acpSessionId = session.acpSessionId
        sink.muted = true
        const state = await connection.loadSession(acpSessionId, cwd, mcpServers, systemPrompt).then(
          (loaded) => loaded,
          () => null // the agent no longer has that session: start a fresh one below, and tell it the history
        ).finally(() => (sink.muted = false))
        if (state) {
          this.forgotten.delete(session.id)
          this.storeState(session.id, await this.applyModel(connection, acpSessionId, state, session.currentModelId ?? defaultModelId))
          return { connection, acpSessionId }
        }
      }
      // A chat that had an ACP session and cannot get it back talks to an agent that remembers nothing of it.
      if (session.acpSessionId) this.forgotten.add(session.id)
      const opened = await connection.newSession(cwd, mcpServers, systemPrompt)
      this.deps.sessions.setAcpSessionId(session.id, opened.acpSessionId)
      const inMode = await this.applyDefaultMode(connection, opened, defaultModeId)
      // The model of a chat that lost its ACP session is the one the person chose; a brand new chat gets the agent's default.
      const model = await this.applyModel(connection, opened.acpSessionId, inMode, session.currentModelId ?? defaultModelId)
      this.storeState(session.id, model)
      return { connection, acpSessionId: opened.acpSessionId }
    } catch (error) {
      await connection.dispose()
      throw error
    }
  }

  /**
   * A fresh session starts in the agent's default mode (Control Centre > Agents) when the agent offers it. A mode the
   * agent does not know, or one that fails to apply, leaves the session in the mode the agent chose.
   */
  private async applyDefaultMode(connection: LiveAgentConnection, opened: OpenedAcpSession, modeId: string | null): Promise<OpenedAcpSession> {
    if (!modeId || modeId === opened.currentModeId || !opened.modes.some((m) => m.id === modeId)) return opened
    try {
      await connection.setMode(opened.acpSessionId, modeId)
      return { ...opened, currentModeId: modeId }
    } catch {
      return opened
    }
  }

  /**
   * Puts the session on `modelId` when the agent offers it and is not already there. Agents start on a model of their own
   * (Claude Code: the `model` of the person's own settings), so a chat that was on Sonnet would come back on Opus after a
   * restart without this. A model the agent does not offer, or one that fails to apply, leaves the agent's choice.
   */
  private async applyModel<T extends AcpSessionState>(connection: LiveAgentConnection, acpSessionId: string, state: T, modelId: string | null): Promise<T> {
    if (!modelId || modelId === state.currentModelId || !state.models.some((m) => m.id === modelId)) return state
    try {
      await connection.setModel(acpSessionId, modelId)
      return { ...state, currentModelId: modelId }
    } catch {
      return state
    }
  }

  private desktopOf(session: SessionDto): Id {
    if (session.desktopId === null || session.desktopId === undefined) throw new AppError('This chat is not on a desktop.')
    return session.desktopId
  }

  private storeState(sessionId: Id, state: AcpSessionState): void {
    const { sessions } = this.deps
    sessions.replaceModes(sessionId, state.modes)
    sessions.replaceModels(sessionId, state.models)
    sessions.setCurrentMode(sessionId, state.currentModeId)
    sessions.setCurrentModel(sessionId, state.currentModelId)
  }

  /** An idle agent that goes away reconnects on the next message; one that goes away mid-turn is a problem to report. */
  private onClosed(sessionId: Id, connection: LiveAgentConnection): void {
    if (!this.deps.pool.forget(sessionId, connection)) return
    const busy = isBusy(this.deps.sessions.get(sessionId)?.status)
    if (busy) this.deps.problems?.set(sessionId, stoppedUnexpectedly(new Error('ACP connection closed')))
    this.deps.broadcaster.setStatus(sessionId, busy ? 'error' : 'closed')
  }
}
