import type { Locator } from 'playwright'

/** One Explorer window (pass the `window-explorer` frame). */
export class ExplorerWindow {
  constructor(readonly frame: Locator) {}

  get app(): Locator {
    return this.frame.getByTestId('explorer-app')
  }

  get address(): Locator {
    return this.frame.getByTestId('explorer-address')
  }

  /** Drive tile in the Computer view (`c`, `e`...). */
  drive(letter: string): Locator {
    return this.frame.getByTestId(`explorer-drive-${letter.toLowerCase()}`)
  }

  get drives(): Locator {
    return this.frame.getByTestId('explorer-computer')
  }

  get items(): Locator {
    return this.frame.getByTestId('explorer-item')
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: name })
  }

  /** Navigation pane entry of a drive. */
  treeDrive(letter: string): Locator {
    return this.frame.getByTestId(`explorer-tree-drive-${letter.toLowerCase()}`)
  }

  async openDrive(letter: string): Promise<void> {
    await this.drive(letter).dblclick()
  }

  async openItem(name: string): Promise<void> {
    await this.item(name).dblclick()
  }

  async up(): Promise<void> {
    await this.frame.getByTestId('explorer-up').click()
  }
}
