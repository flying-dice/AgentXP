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

  /** The note at the top of the window that a key press shows and flashes: the Terminal is read-only. */
  get readOnlyNotice(): Locator {
    return this.frame.getByTestId('terminal-readonly-notice')
  }

  /** The left cell of the status bar: it says that nothing was typed while the note flashes. */
  get readOnlyStatus(): Locator {
    return this.frame.getByTestId('terminal-readonly-status')
  }

  get status(): Locator {
    return this.frame.getByTestId('terminal-status')
  }
}
