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
  /** Resolves true when the turn went through. */
  send(text: string, attachments?: string[]): Promise<boolean>
  resend(options?: { restart?: boolean }): Promise<boolean>
  /** "Edit": takes the failed message back and returns it (null when it cannot be taken back). */
  takeBack(): Promise<FailedSend | null>
  reconnect(): Promise<void>
  resolveInterrupt(optionId: string | null, interruptId?: string): Promise<void>
  sendA2uiAction(event: A2uiClientEvent): Promise<void>
  cancel(): Promise<void>
}
