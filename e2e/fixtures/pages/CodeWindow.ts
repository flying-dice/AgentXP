import type { Locator } from 'playwright'

/** One Code window (pass the `window-code` frame). */
export class CodeWindow {
  constructor(readonly frame: Locator) {}

  get tabs(): Locator {
    return this.frame.getByTestId('code-tab')
  }

  tab(name: string): Locator {
    return this.tabs.filter({ hasText: name })
  }

  get editor(): Locator {
    return this.frame.getByTestId('code-editor')
  }

  /** Double-click a file in the file tree to open it. */
  async openFile(name: string): Promise<void> {
    await this.frame.getByTestId('file-tree-file').filter({ hasText: name }).dblclick()
  }

  async showChanges(): Promise<void> {
    if (!(await this.frame.getByTestId('code-changes').isVisible())) await this.frame.getByTestId('code-changes-toggle').click()
    await this.frame.getByTestId('code-changes').waitFor()
  }

  /** Rows of the Changes list (open it first). */
  get changes(): Locator {
    return this.frame.getByTestId('changes-item')
  }
}
