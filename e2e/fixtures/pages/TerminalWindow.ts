import type { Locator } from 'playwright'

/** One Terminal window (pass the `window-terminal` frame). */
export class TerminalWindow {
  constructor(readonly frame: Locator) {}

  get output(): Locator {
    return this.frame.getByTestId('terminal-output')
  }

  /** The terminal chooser (shown when several terminals exist). */
  get picker(): Locator {
    return this.frame.getByTestId('terminal-picker')
  }

  /** The note a key press shows at the bottom of the screen: the Terminal is read-only. */
  get readOnlyNotice(): Locator {
    return this.frame.getByTestId('terminal-readonly-notice')
  }

  get status(): Locator {
    return this.frame.getByTestId('terminal-status')
  }
}
