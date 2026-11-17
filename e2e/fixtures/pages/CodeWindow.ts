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

  // ---- Search tab (find in files) ---------------------------------------------------------------

  get searchTab(): Locator {
    return this.frame.getByTestId('code-mgmt-tab-search')
  }

  /** The Search pane; `data-searching` is "true" while a search runs. */
  get search(): Locator {
    return this.frame.getByTestId('code-search')
  }

  get searchQuery(): Locator {
    return this.frame.getByTestId('code-search-query')
  }

  get searchInclude(): Locator {
    return this.frame.getByTestId('code-search-include')
  }

  get searchSummary(): Locator {
    return this.frame.getByTestId('code-search-summary')
  }

  /** Matching lines (`data-path`, `data-line`). */
  get searchResults(): Locator {
    return this.frame.getByTestId('code-search-result')
  }

  get searchFiles(): Locator {
    return this.frame.getByTestId('code-search-file')
  }

  /** Types into the Search tab and presses Enter. */
  async findInFiles(query: string): Promise<void> {
    if ((await this.searchTab.getAttribute('aria-selected')) !== 'true') await this.searchTab.click()
    await this.searchQuery.fill(query)
    await this.searchQuery.press('Enter')
  }
}
