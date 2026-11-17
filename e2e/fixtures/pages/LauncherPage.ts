import type { Locator, Page } from 'playwright'

/** The launcher window ("AgentXP Desktop Connection"). Locators are test ids only. */
export class LauncherPage {
  readonly window: Locator
  readonly rows: Locator

  constructor(readonly page: Page) {
    this.window = page.getByTestId('launcher-window')
    this.rows = page.getByTestId('launcher-desktop-row')
  }

  row(title: string): Locator {
    return this.rows.filter({ has: this.page.getByTestId('launcher-desktop-name').filter({ hasText: title }) })
  }

  /** The desktop id the row carries is read via the connect flow; the row itself is found by title. */
  async select(title: string): Promise<void> {
    await this.row(title).click()
  }

  /** "New..." dialog: name, ticked projects (by folder name) and Create. Resolves when the new row is listed. */
  async createDesktop(title: string, options: { projects?: string[] } = {}): Promise<void> {
    await this.page.getByTestId('launcher-new').click()
    const dialog = this.page.getByTestId('new-desktop-dialog')
    await dialog.getByTestId('new-desktop-name').fill(title)
    for (const project of options.projects ?? []) {
      await dialog.getByTestId('new-desktop-project').filter({ hasText: project }).getByTestId('new-desktop-project-check').click()
    }
    await dialog.getByTestId('dialog-button-ok').click()
    await this.row(title).waitFor()
  }

  async connect(title: string): Promise<void> {
    await this.select(title)
    await this.page.getByTestId('launcher-connect').click()
  }

  /** Needs "Show Options" open. */
  async disconnect(title: string): Promise<void> {
    await this.select(title)
    await this.showOptions()
    await this.page.getByTestId('launcher-disconnect').click()
  }

  async showOptions(): Promise<void> {
    if (!(await this.page.getByTestId('launcher-disconnect').isVisible())) await this.page.getByTestId('launcher-options').click()
  }

  /** Delete... then confirm the message box. */
  async deleteDesktop(title: string): Promise<void> {
    await this.select(title)
    await this.page.getByTestId('launcher-delete').click()
    await this.page.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await this.row(title).waitFor({ state: 'detached' })
  }

  /** The row's "Connected" chip. */
  connectedChip(title: string): Locator {
    return this.row(title).getByTestId('launcher-desktop-connected')
  }
}
