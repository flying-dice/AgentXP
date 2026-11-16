import type { Id } from '@shared/models'
import type { AgentSessionEvent } from '../domain/agent/AgentSessionEvent'
import type { AgentSessionEventSink } from '../domain/agent/AgentSessionEventSink'

export type SessionEventListener = (sessionId: Id, event: AgentSessionEvent) => void

/** In-process fan-out of agent events: the projector and any other translator subscribe side by side. */
export class SessionEventBus {
  private readonly listeners = new Set<SessionEventListener>()

  /** Returns an unsubscribe function. */
  subscribe(listener: SessionEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** A sink for one connection: every event it receives belongs to `sessionId`. */
  forSession(sessionId: Id): AgentSessionEventSink {
    return { emit: (_sessionKey, event) => this.publish(sessionId, event) }
  }

  publish(sessionId: Id, event: AgentSessionEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(sessionId, event)
      } catch (error) {
        console.error('Session event listener failed', error)
      }
    }
  }
}
