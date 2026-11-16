import type { AgentProcessDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { AgentConnectionPool } from './AgentConnectionPool'
import type { SessionBroadcaster } from './SessionBroadcaster'

/**
 * The running agent processes for the Agent Manager, grouped by (agent, desktop).
 * Today every chat has its own process; the grouping is what the UI shows.
 */
export class ProcessService {
  constructor(
    private readonly pool: AgentConnectionPool,
    private readonly sessions: SessionRepository,
    private readonly agents: AgentRepository,
    private readonly broadcaster: SessionBroadcaster
  ) {}

  list(): AgentProcessDto[] {
    const groups = new Map<string, AgentProcessDto>()
    for (const [sessionId, live] of this.pool.entries()) {
      const session = this.sessions.get(sessionId)
      if (!session || session.desktopId == null) continue
      const key = `${session.agentId}:${session.desktopId}`
      const group = groups.get(key) ?? {
        agentId: session.agentId,
        agentName: this.agents.get(session.agentId)?.name ?? `Agent ${session.agentId}`,
        desktopId: session.desktopId,
        pid: null,
        sessionIds: []
      }
      group.sessionIds.push(sessionId)
      group.pid ??= live.connection.pid ?? null
      groups.set(key, group)
    }
    return [...groups.values()]
  }

  /** Ends the agent processes of the (agent, desktop); their chats show as closed and reconnect when used again. */
  async end(agentId: Id, desktopId: Id): Promise<void> {
    const ids = this.list().find((p) => p.agentId === agentId && p.desktopId === desktopId)?.sessionIds ?? []
    for (const id of ids) {
      await this.pool.dispose(id)
      this.broadcaster.setStatus(id, 'closed')
    }
  }
}
