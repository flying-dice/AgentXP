import type { Locator } from 'playwright'

/** One Terminal window (pass the `window-terminal` frame). */
export class TerminalWindow {
  constructor(readonly frame: Locator) {}

  get output(): Locator {
    return this.frame.getByTestId('terminal-output')
  }

  get status(): Locator {
    return this.frame.getByTestId('terminal-status')
  }
}
