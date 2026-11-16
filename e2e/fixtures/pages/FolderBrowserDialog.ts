import type { Locator, Page } from 'playwright'

/** The in-app "Browse For Folder" dialog (New desktop > Browse..., Computer > Plug in a project...). Test ids only. */
export class FolderBrowserDialog {
  constructor(readonly page: Page) {}

  get dialog(): Locator {
    return this.page.getByTestId('folder-browser-dialog')
  }

  get instruction(): Locator {
    return this.dialog.getByTestId('folder-browser-instruction')
  }

  get tree(): Locator {
    return this.dialog.getByTestId('folder-browser-tree')
  }

  get status(): Locator {
    return this.dialog.getByTestId('folder-browser-status')
  }

  /** The Folder box: follows the selection and accepts a typed path. */
  get path(): Locator {
    return this.dialog.getByTestId('folder-browser-path')
  }

  get makeNewFolder(): Locator {
    return this.dialog.getByTestId('folder-browser-new-folder')
  }

  get ok(): Locator {
    return this.dialog.getByTestId('dialog-button-ok')
  }

  get cancel(): Locator {
    return this.dialog.getByTestId('dialog-button-cancel')
  }

  /** A folder of the tree by its exact name. */
  node(name: string): Locator {
    return this.dialog.getByTestId('folder-browser-node').filter({ hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
  }

  /** Types a folder path into the Folder box and presses OK. */
  async chooseByTyping(path: string): Promise<void> {
    await this.path.fill(path)
    await this.ok.click()
  }

  /**
   * The label of a tree row is narrower than the row, so clicks aim at the text: it starts after the indent of the
   * row's depth (14 px a level) and the expand arrow.
   */
  private hit(depth: number): { position: { x: number; y: number } } {
    return { position: { x: depth * 14 + 34, y: 10 } }
  }

  /** Opens the folders of an absolute POSIX path one by one with the mouse (double-click) and selects the last one. */
  async selectByMouse(path: string): Promise<void> {
    const names = path.split('/').filter(Boolean)
    await this.node('/').dblclick(this.hit(1))
    for (const [i, name] of names.slice(0, -1).entries()) {
      const row = this.node(name)
      await row.waitFor()
      await row.dblclick(this.hit(i + 2))
    }
    const last = this.node(names[names.length - 1])
    await last.waitFor()
    await last.click(this.hit(names.length + 1))
  }
}
