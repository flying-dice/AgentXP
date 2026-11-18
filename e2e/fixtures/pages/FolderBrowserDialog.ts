import { expect } from 'vitest'
import type { Locator, Page } from 'playwright'
import { see } from '../expect'

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

  /** A group at the top of the tree ("Projects you used before", "Matches"). */
  group(name: string): Locator {
    return this.dialog.getByTestId('folder-browser-group').filter({ hasText: name })
  }

  /** The entry of a project in "Projects you used before" (the first row of that name). */
  recentNode(name: string): Locator {
    return this.node(name).first()
  }

  /** A folder of the tree by its exact name. */
  node(name: string): Locator {
    return this.dialog.getByTestId('folder-browser-node').filter({ hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
  }

  /**
   * Waits until the selected folder is open and its folders are listed. A folder with thousands of entries (the
   * shared temp folder) takes seconds to list: until then type-ahead finds nothing under it (it wraps to the same name
   * in "Projects you used before") and OK stays dimmed, so Enter does nothing.
   */
  async waitForSelectedOpen(): Promise<void> {
    await see.eventually(async () => {
      const state = await this.dialog.getByTestId('folder-browser-node').evaluateAll((rows) => {
        const row = rows.find((r) => r.getAttribute('aria-selected') === 'true')
        return row ? `${row.getAttribute('aria-expanded')} ${row.getAttribute('aria-busy') ?? 'listed'}` : 'none'
      })
      expect(state).toBe('true listed')
    })
  }

  /** The folder of a path selected in the tree under Computer (not its entry in "Projects you used before"). */
  async selectedPath(): Promise<{ path: string | null; level: number }> {
    return this.dialog.getByTestId('folder-browser-node').evaluateAll((rows) => {
      const row = rows.find((r) => r.getAttribute('aria-selected') === 'true')
      return { path: row?.getAttribute('data-path') ?? null, level: Number(row?.getAttribute('aria-level') ?? 0) }
    })
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
    // A project used before also shows in its own group above Computer, so the row under Computer is the last one.
    for (const [i, name] of names.slice(0, -1).entries()) {
      const row = this.node(name).last()
      await row.waitFor()
      await row.dblclick(this.hit(i + 2))
    }
    const last = this.node(names[names.length - 1]).last()
    await last.waitFor()
    await last.click(this.hit(names.length + 1))
  }
}
