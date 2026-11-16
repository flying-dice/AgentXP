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
    await this.frame.getByTestId('code-tree-item').filter({ hasText: name }).dblclick()
  }

  async showChanges(): Promise<void> {
    if (!(await this.frame.getByTestId('code-logs').isVisible())) await this.frame.getByTestId('code-changes-toggle').click()
    const tab = this.frame.getByTestId('code-logs-tab-changes')
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click()
    await this.frame.getByTestId('code-changes').waitFor()
  }

  /** Rows of the Changes list (open it first). */
  get changes(): Locator {
    return this.frame.getByTestId('changes-item')
  }

  /** The status bar's branch label (only in a git repository). */
  get branch(): Locator {
    return this.frame.getByTestId('code-git-branch')
  }

  /** A row of the file tree by file or folder name. */
  treeItem(name: string): Locator {
    return this.frame.getByTestId('code-tree-item').filter({ hasText: name })
  }

  /** Gutter marks of the open file (green/blue bars, red triangles). */
  get gutterMarks(): Locator {
    return this.frame.getByTestId('code-gutter-mark')
  }

  get peek(): Locator {
    return this.frame.getByTestId('code-hunk-peek')
  }
}
