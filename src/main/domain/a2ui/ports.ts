import type { A2uiServerMessage } from '@shared/a2ui'

export type A2uiSinkResult = { ok: true } | { ok: false; errors: string[] }

/** Receives validated A2UI messages the agent of a session wants to apply. */
export interface A2uiMessageSink {
  apply(sessionKey: string, messages: A2uiServerMessage[]): Promise<A2uiSinkResult>
}
