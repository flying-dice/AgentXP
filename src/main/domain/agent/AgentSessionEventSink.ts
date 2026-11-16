import type { AgentSessionEvent } from './AgentSessionEvent'

/** Receives normalised agent events. `sessionKey` is the ACP session id. */
export interface AgentSessionEventSink {
  emit(sessionKey: string, event: AgentSessionEvent): void
}
