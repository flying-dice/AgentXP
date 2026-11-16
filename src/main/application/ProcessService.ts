import type { AgentProcessDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import type { SessionRepository } from '../domain/repositories/session-repository'
import { endedByUser } from './agentProblems'
import type { AgentConnectionPool } from './AgentConnectionPool'
import type { SessionBroadcaster } from './SessionBroadcaster'
import type { SessionProblems } from './SessionProblems'

/** What an agent program uses right now. */
export interface ProcessUsage {
  memoryBytes: number
  /** Percent of one CPU core. */
  cpuPercent: number
}

/** Reads the usage of a program by its process id; null when it is unknown (yet). Never waits. */
export interface ProcessUsagePort {
  sample(pid: number): ProcessUsage | null
}

/**
 * The running agent processes for the Agent Manager, grouped by (agent, desktop).
 * Today every chat has its own process; the grouping is what the UI shows.
 */
export class ProcessService {
  constructor(
    private readonly pool: AgentConnectionPool,
    private readonly sessions: SessionRepository,
    private readonly agents: AgentRepository,
    private readonly broadcaster: SessionBroadcaster,
    private readonly problems?: SessionProblems,
    private readonly usage?: ProcessUsagePort
  ) {}

  list(): AgentProcessDto[] {
    const groups = new Map<string, AgentProcessDto>()
    for (const [sessionId, live] of this.pool.entries()) {
      const session = this.sessions.get(sessionId)
      if (!session || session.desktopId == null) continue
      const key = `${session.agentId}:${session.desktopId}`
      const group = groups.get(key) ?? {
        agentId: session.agentId,
        agentName: this.agents.get(session.agentId)?.name ?? `Removed agent (${session.agentId})`,
        desktopId: session.desktopId,
        pid: null,
        memoryBytes: null,
        cpuPercent: null,
        sessionIds: []
      }
      group.sessionIds.push(sessionId)
      group.pid ??= live.connection.pid ?? null
      groups.set(key, group)
    }
    for (const group of groups.values()) {
      const used = group.pid === null ? null : (this.usage?.sample(group.pid) ?? null)
      group.memoryBytes = used?.memoryBytes ?? null
      group.cpuPercent = used?.cpuPercent ?? null
    }
    return [...groups.values()]
  }

  /**
   * Ends the agent processes of the (agent, desktop); their chats say "The agent program was stopped." and start a
   * fresh program when used again (Restart).
   */
  async end(agentId: Id, desktopId: Id): Promise<void> {
    const ids = this.list().find((p) => p.agentId === agentId && p.desktopId === desktopId)?.sessionIds ?? []
    for (const id of ids) {
      await this.pool.dispose(id)
      this.problems?.set(id, endedByUser())
      this.broadcaster.setStatus(id, 'closed')
    }
  }
}
