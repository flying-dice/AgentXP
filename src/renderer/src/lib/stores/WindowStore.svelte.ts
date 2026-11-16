import type { Agent7Api } from '@shared/ipc'

/** Frame state of the (frameless) main window. */
export class WindowStore {
  maximized = $state(false)
  focused = $state(true)
  private readonly api: Agent7Api['window']

  constructor(api: Agent7Api['window']) {
    this.api = api
  }

  /** Reads the current state and follows changes; returns the unsubscribe function. */
  start(): () => void {
    const off = this.api.onStateChanged((state) => this.apply(state))
    void this.api.getState().then((state) => this.apply(state))
    return off
  }

  private apply(state: { maximized: boolean; focused: boolean }): void {
    this.maximized = state.maximized
    this.focused = state.focused
  }

  minimize = (): void => void this.api.minimize()
  toggleMaximize = (): void => void this.api.toggleMaximize()
  close = (): void => void this.api.close()
}
