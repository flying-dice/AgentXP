import type { Interrupt, Message } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import type { AguiSessionState } from '@shared/agui-state'
import type { SurfaceActivity } from '../../agui/activities'

/** The part of `SessionAgentStore` the session view uses (so stories can drive it with a fake). */
export interface SessionStoreLike {
  readonly messages: readonly Message[]
  readonly state: AguiSessionState
  readonly running: boolean
  readonly error: string | null
  readonly pendingInterrupt: Interrupt | null
  readonly activities: ReadonlyMap<string, SurfaceActivity>
  send(text: string, attachments?: string[]): Promise<void>
  resolveInterrupt(optionId: string | null, interruptId?: string): Promise<void>
  sendA2uiAction(event: A2uiClientEvent): Promise<void>
  cancel(): Promise<void>
}
