import type { Interrupt, Message } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import type { AguiSessionState } from '@shared/agui-state'
import type { SurfaceActivity } from '../../agui/activities'
import type { FailedSend } from '../../agui/SessionAgentStore.svelte'

/** The part of `SessionAgentStore` the session view uses (so stories can drive it with a fake). */
export interface SessionStoreLike {
  readonly messages: readonly Message[]
  readonly state: AguiSessionState
  readonly running: boolean
  readonly error: string | null
  readonly pendingInterrupt: Interrupt | null
  readonly activities: ReadonlyMap<string, SurfaceActivity>
  /** The last send that did not go through (see `SessionAgentStore.failedSend`). */
  readonly failedSend: FailedSend | null
  /** Tool calls whose permission request the user denied (shown "Denied by you"). */
  readonly deniedToolCalls: ReadonlySet<string>
  /** What the user answered to the last permission request, until the next message (optional for fakes). */
  readonly lastDecision?: { allowed: boolean; text: string } | null
  /** The user stopped the last reply. */
  readonly stoppedByUser: boolean
  /** The user started a new chat with the failed text: this chat says "Continued in a new chat" (optional for fakes). */
  readonly continued?: boolean
  /** The failed request that a Reconnect did not send again, or null (optional for fakes). */
  readonly notResent?: string | null
  /** Ids of messages of a cut-off turn that were sent again, and of the repeats (optional for fakes). */
  readonly stoppedIds?: ReadonlySet<string>
  readonly resentIds?: ReadonlySet<string>
  /** Resolves true when the turn went through. */
  send(text: string, attachments?: string[]): Promise<boolean>
  resend(options?: { restart?: boolean }): Promise<boolean>
  /** "Edit": takes the failed message back and returns it (null when it cannot be taken back). */
  takeBack(): Promise<FailedSend | null>
  reconnect(options?: { announce?: boolean }): Promise<void>
  markContinued?(): void
  resolveInterrupt(optionId: string | null, interruptId?: string): Promise<void>
  sendA2uiAction(event: A2uiClientEvent): Promise<void>
  cancel(): Promise<void>
}
