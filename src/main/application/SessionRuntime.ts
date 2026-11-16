import type { AgentDto, FolderDto, Id, SessionDto } from '@shared/models'
import type { AgentSessionEvent } from '../domain/agent/AgentSessionEvent'
import type { AgentSessionEventSink } from '../domain/agent/AgentSessionEventSink'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { FolderRepository } from '../domain/repositories/folder-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { AgentConnectionPool, LiveSession } from './AgentConnectionPool'
import { required } from './errors'
import type { A2uiMcpConfigFactory, AcpSessionState, AgentConnector, LiveAgentConnection } from './ports'
import type { ToolGate } from '../domain/agent/ToolGate'
import type { PermissionBroker } from './PermissionBroker'
import type { SessionBroadcaster } from './SessionBroadcaster'
import type { SessionEventBus } from './SessionEventBus'
import type { TerminalRecorder } from './TerminalRecorder'
import type { WorkspaceFiles } from './WorkspaceFiles'

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
  folders: FolderRepository
  events: SessionEventBus
  broker: PermissionBroker
  workspaceFiles: WorkspaceFiles
  terminals: TerminalRecorder
  broadcaster: SessionBroadcaster
  a2uiMcpConfig: A2uiMcpConfigFactory
  /** Gate for the client-side fs and terminal requests of a session. */
  toolGate(sessionId: Id): ToolGate
}

/** Brings a session's agent online (also after an app restart) and keeps the session row in sync. */
export class SessionRuntime {
  private readonly connecting = new Map<Id, Promise<LiveSession>>()

  constructor(private readonly deps: RuntimeDeps) {}

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
    const folder = required(this.deps.folders.get(session.folderId), 'Folder')
    broadcaster.setStatus(sessionId, 'connecting')
    const sink = new MutableSink(this.deps.events.forSession(sessionId))
    try {
      const connection = await this.openConnection(agent, folder, sessionId, sink)
      const live = await this.openSession(connection, session, folder.path, sink)
      pool.add(sessionId, live)
      broadcaster.setStatus(sessionId, 'idle')
      void connection.closed.then(() => this.onClosed(sessionId, connection))
      return live
    } catch (error) {
      broadcaster.setStatus(sessionId, 'error')
      throw error
    }
  }

  private openConnection(agent: AgentDto, folder: FolderDto, sessionId: Id, sink: AgentSessionEventSink): Promise<LiveAgentConnection> {
    const { broker, workspaceFiles, terminals } = this.deps
    return this.deps.connector.open({
      agent,
      cwd: folder.path,
      handlers: {
        sink,
        permissions: broker.forSession(sessionId),
        gate: this.deps.toolGate(sessionId),
        files: workspaceFiles.forSession(sessionId, folder.path),
        onTerminalActivity: (activity) => terminals.record(sessionId, activity)
      }
    })
  }

  /** Resumes the persisted ACP session when possible, otherwise starts a fresh one. */
  private async openSession(
    connection: LiveAgentConnection,
    session: SessionDto,
    cwd: string,
    sink: MutableSink
  ): Promise<LiveSession> {
    const mcpServers = [this.deps.a2uiMcpConfig(session.id)]
    try {
      if (session.acpSessionId && connection.canLoadSession) {
        const acpSessionId = session.acpSessionId
        sink.muted = true
        const state = await connection.loadSession(acpSessionId, cwd, mcpServers).finally(() => (sink.muted = false))
        this.storeState(session.id, state)
        return { connection, acpSessionId }
      }
      const opened = await connection.newSession(cwd, mcpServers)
      this.deps.sessions.setAcpSessionId(session.id, opened.acpSessionId)
      this.storeState(session.id, opened)
      return { connection, acpSessionId: opened.acpSessionId }
    } catch (error) {
      await connection.dispose()
      throw error
    }
  }

  private storeState(sessionId: Id, state: AcpSessionState): void {
    const { sessions } = this.deps
    sessions.replaceModes(sessionId, state.modes)
    sessions.replaceModels(sessionId, state.models)
    sessions.setCurrentMode(sessionId, state.currentModeId)
    sessions.setCurrentModel(sessionId, state.currentModelId)
  }

  private onClosed(sessionId: Id, connection: LiveAgentConnection): void {
    if (this.deps.pool.forget(sessionId, connection)) this.deps.broadcaster.setStatus(sessionId, 'closed')
  }
}
