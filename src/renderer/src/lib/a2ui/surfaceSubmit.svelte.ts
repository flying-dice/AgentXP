/**
 * What the person sees after pressing a button on a form the agent drew: "Sending..." (the button is disabled, so a
 * second click cannot send the form again) until the agent's reply has arrived, then "Sent." under the button.
 * One per surface; `A2uiSurface` owns it and the Button wrapper reads it through Svelte context.
 */
import { getContext, setContext } from 'svelte'

export type SubmitPhase = 'idle' | 'sending' | 'sent'

/** How long "Sending..." lasts at most when no reply ever arrives (no store tells the surface when the reply ends). */
export const SENDING_TIMEOUT_MS = 20_000

export class SurfaceSubmit {
  phase = $state<SubmitPhase>('idle')
  /** The component (button) that sent the form, so "Sent." appears under that one only. */
  sourceId = $state<string | null>(null)
  private sawBusy = false

  /** The button was pressed. */
  begin(sourceId: string): void {
    this.phase = 'sending'
    this.sourceId = sourceId
    this.sawBusy = false
  }

  /**
   * `busy` is true while the agent works on a turn. The form is "Sent." once a turn began and ended after the press;
   * without a busy signal at all (`undefined`) it is sent at once.
   */
  follow(busy: boolean | undefined): void {
    if (this.phase !== 'sending') return
    if (busy === undefined) this.finish()
    else if (busy) this.sawBusy = true
    else if (this.sawBusy) this.finish()
  }

  /** The agent changed the form after "Sent.": it can be sent again. */
  reset(): void {
    if (this.phase === 'sent') this.phase = 'idle'
  }

  finish(): void {
    if (this.phase === 'sending') this.phase = 'sent'
  }
}

const KEY = Symbol('a2ui-surface-submit')

export const provideSurfaceSubmit = (submit: SurfaceSubmit): void => void setContext(KEY, submit)

/** The submit state of the surface the component is in (a detached one outside a surface, so tests need no setup). */
export const useSurfaceSubmit = (): SurfaceSubmit => (getContext<SurfaceSubmit | undefined>(KEY) ?? new SurfaceSubmit())
