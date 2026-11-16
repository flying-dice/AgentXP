import type { Interrupt, Message } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import type { AguiSessionState } from '@shared/agui-state'
import { surfacesOf, type SurfaceActivity } from '../../agui/activities'
import type { SessionStoreLike } from './SessionStoreLike'

export interface FakeInit {
  messages: Message[]
  state: AguiSessionState
  running?: boolean
  error?: string | null
  interrupt?: Interrupt | null
}

/** In-memory stand-in for `SessionAgentStore` (stories): records the calls and reacts minimally. */
export class FakeSessionStore implements SessionStoreLike {
  messages = $state.raw<Message[]>([])
  state = $state.raw<AguiSessionState>(null as unknown as AguiSessionState)
  running = $state(false)
  error = $state<string | null>(null)
  pendingInterrupt = $state.raw<Interrupt | null>(null)
  activities = $derived<Map<string, SurfaceActivity>>(surfacesOf(this.messages))
  /** Everything the view asked of the store, newest last. */
  calls = $state.raw<string[]>([])

  constructor(init: FakeInit) {
    this.messages = init.messages
    this.state = init.state
    this.running = init.running ?? false
    this.error = init.error ?? null
    this.pendingInterrupt = init.interrupt ?? null
  }

  private log(entry: string): void {
    this.calls = [...this.calls, entry]
  }

  async send(text: string, attachments: string[] = []): Promise<void> {
    this.log(`send(${JSON.stringify(text)}, ${JSON.stringify(attachments)})`)
    this.messages = [...this.messages, { id: `u${this.messages.length}`, role: 'user', content: text }]
  }

  async resolveInterrupt(optionId: string | null): Promise<void> {
    this.log(`resolveInterrupt(${JSON.stringify(optionId)})`)
    this.pendingInterrupt = null
  }

  async sendA2uiAction(event: A2uiClientEvent): Promise<void> {
    this.log(`sendA2uiAction(${JSON.stringify(event.action).slice(0, 60)})`)
  }

  async cancel(): Promise<void> {
    this.log('cancel()')
    this.running = false
  }
}
