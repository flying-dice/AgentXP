import type { Interrupt, Message } from '@ag-ui/core'
import type { A2uiClientEvent } from '@shared/a2ui'
import type { AguiSessionState } from '@shared/agui-state'
import { surfacesOf, type SurfaceActivity } from '../../agui/activities'
import type { FailedSend } from '../../agui/SessionAgentStore.svelte'
import type { SessionStoreLike } from './SessionStoreLike'

export interface FakeInit {
  messages: Message[]
  state: AguiSessionState
  running?: boolean
  error?: string | null
  interrupt?: Interrupt | null
  failedSend?: FailedSend | null
  stoppedByUser?: boolean
}

/** In-memory stand-in for `SessionAgentStore` (stories): records the calls and reacts minimally. */
export class FakeSessionStore implements SessionStoreLike {
  messages = $state.raw<Message[]>([])
  state = $state.raw<AguiSessionState>(null as unknown as AguiSessionState)
  running = $state(false)
  error = $state<string | null>(null)
  pendingInterrupt = $state.raw<Interrupt | null>(null)
  failedSend = $state.raw<FailedSend | null>(null)
  stoppedByUser = $state(false)
  deniedToolCalls = $state.raw<ReadonlySet<string>>(new Set())
  activities = $derived<Map<string, SurfaceActivity>>(surfacesOf(this.messages))
  /** Everything the view asked of the store, newest last. */
  calls = $state.raw<string[]>([])

  constructor(init: FakeInit) {
    this.messages = init.messages
    this.state = init.state
    this.running = init.running ?? false
    this.error = init.error ?? null
    this.pendingInterrupt = init.interrupt ?? null
    this.failedSend = init.failedSend ?? null
    this.stoppedByUser = init.stoppedByUser ?? false
  }

  private log(entry: string): void {
    this.calls = [...this.calls, entry]
  }

  async send(text: string, attachments: string[] = []): Promise<boolean> {
    this.log(`send(${JSON.stringify(text)}, ${JSON.stringify(attachments)})`)
    this.messages = [...this.messages, { id: `u${this.messages.length}`, role: 'user', content: text }]
    return true
  }

  async resend(options?: { restart?: boolean }): Promise<boolean> {
    this.log(`resend(${JSON.stringify(options ?? {})})`)
    this.failedSend = null
    return true
  }

  async takeBack(): Promise<FailedSend | null> {
    this.log('takeBack()')
    const failed = this.failedSend
    this.failedSend = null
    return failed
  }

  async reconnect(): Promise<void> {
    this.log('reconnect()')
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
    this.stoppedByUser = true
  }
}
