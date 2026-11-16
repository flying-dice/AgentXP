import type { A2uiServerMessage, A2uiSurfaceTarget } from '@shared/a2ui'

/** `notes` are sentences for the agent about where its surfaces ended up (shown in the `a2ui_render` result). */
export type A2uiSinkResult = { ok: true; notes?: string[] } | { ok: false; errors: string[] }

export interface A2uiApplyOptions {
  /** Where the surfaces created by this batch go (default `inline`). Existing surfaces stay where they are. */
  target?: A2uiSurfaceTarget
}

/** Receives validated A2UI messages the agent of a session wants to apply. */
export interface A2uiMessageSink {
  apply(sessionKey: string, messages: A2uiServerMessage[], options?: A2uiApplyOptions): Promise<A2uiSinkResult>
}
