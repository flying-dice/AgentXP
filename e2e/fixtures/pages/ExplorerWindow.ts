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

  // ---- Search Companion -----------------------------------------------------------------------

  get searchButton(): Locator {
    return this.frame.getByTestId('explorer-search')
  }

  /** The Search Companion; `data-searching` is "true" while a search runs. */
  get searchPane(): Locator {
    return this.frame.getByTestId('explorer-search-pane')
  }

  get searchName(): Locator {
    return this.frame.getByTestId('explorer-search-name')
  }

  get searchContaining(): Locator {
    return this.frame.getByTestId('explorer-search-containing')
  }

  get searchStatus(): Locator {
    return this.frame.getByTestId('explorer-search-status')
  }

  get searchResults(): Locator {
    return this.frame.getByTestId('explorer-search-result')
  }

  searchResult(name: string): Locator {
    return this.searchResults.filter({ hasText: name })
  }

  /** Opens the Search Companion (when closed), fills the criteria and clicks Search. */
  async find(criteria: { name?: string; containing?: string }): Promise<void> {
    if (!(await this.searchPane.isVisible())) await this.searchButton.click()
    await this.searchName.fill(criteria.name ?? '')
    await this.searchContaining.fill(criteria.containing ?? '')
    await this.frame.getByTestId('explorer-search-run').click()
  }

  async closeSearch(): Promise<void> {
    await this.frame.getByTestId('explorer-search-back').click()
  }

  // ---- Computer: plug in, eject, recently removed -----------------------------------------------

  get plugIn(): Locator {
    return this.frame.getByTestId('explorer-plug-in')
  }

  get plugInAgain(): Locator {
    return this.frame.getByTestId('explorer-plug-in-again')
  }

  get eject(): Locator {
    return this.frame.getByTestId('explorer-eject')
  }

  get removedGroup(): Locator {
    return this.frame.getByTestId('explorer-removed-group')
  }

  get removed(): Locator {
    return this.frame.getByTestId('explorer-removed-item')
  }

  /** Status bar text ("1 project plugged in" on Computer). */
  get itemCount(): Locator {
    return this.frame.getByTestId('explorer-item-count')
  }
}
