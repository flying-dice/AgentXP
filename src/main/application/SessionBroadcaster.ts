import type { Id, SessionStatus } from '@shared/models'
import type { SessionRepository } from '../domain/repositories/session-repository'
import type { EventPublisher } from './ports'

/** Writes session-row changes and tells the renderer about them. */
export class SessionBroadcaster {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly events: EventPublisher
  ) {}

  setStatus(sessionId: Id, status: SessionStatus): void {
    this.sessions.setStatus(sessionId, status)
    this.refresh(sessionId)
  }

  /** Publishes the current row as `session.changed` (no-op when the session is gone). */
  refresh(sessionId: Id): void {
    const session = this.sessions.get(sessionId)
    if (session) this.events.publish('session.changed', session)
  }
}
