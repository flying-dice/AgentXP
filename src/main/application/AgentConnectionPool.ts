import type { Id } from '@shared/models'
import type { LiveAgentConnection } from './ports'

export interface LiveSession {
  connection: LiveAgentConnection
  /** The ACP session id this connection serves. */
  acpSessionId: string
}

/** The live agent connections, one per session. Owns their disposal. */
export class AgentConnectionPool {
  private readonly live = new Map<Id, LiveSession>()

  get(sessionId: Id): LiveSession | undefined {
    return this.live.get(sessionId)
  }

  add(sessionId: Id, session: LiveSession): void {
    this.live.set(sessionId, session)
  }

  /** Forgets the connection without disposing it; true when it was the registered one. */
  forget(sessionId: Id, connection: LiveAgentConnection): boolean {
    if (this.live.get(sessionId)?.connection !== connection) return false
    this.live.delete(sessionId)
    return true
  }

  async dispose(sessionId: Id): Promise<void> {
    const session = this.live.get(sessionId)
    this.live.delete(sessionId)
    await session?.connection.dispose()
  }

  async disposeAll(): Promise<void> {
    const sessions = [...this.live.values()]
    this.live.clear()
    await Promise.allSettled(sessions.map((s) => s.connection.dispose()))
  }
}
