import type { Locator, Page } from 'playwright'
import { AsidePane } from './AsidePane'
import { ChatWindow } from './ChatWindow'
import { CodeReviewWindow } from './CodeReviewWindow'
import { CodeWindow } from './CodeWindow'
import { ExplorerWindow } from './ExplorerWindow'
import { TerminalWindow } from './TerminalWindow'

export type AppId =
  | 'chat'
  | 'explorer'
  | 'code'
  | 'code-review'
  | 'terminal'
  | 'browser'
  | 'notepad'
  | 'wordpad'
  | 'paint'
  | 'snipping-tool'
  | 'sticky-notes'
  | 'event-viewer'
  | 'agent-manager'
  | 'control-centre'
  | 'recycle-bin'
  | 'surface'
  | 'help'

/** Apps the Start menu hides in a collapsible group. */
const START_GROUP: Partial<Record<AppId, string>> = {
  notepad: 'accessories',
  wordpad: 'accessories',
  paint: 'accessories',
  'snipping-tool': 'accessories',
  'sticky-notes': 'accessories',
  'event-viewer': 'system-tools',
  'agent-manager': 'system-tools',
  'control-centre': 'system-tools'
}

/** A desktop window: taskbar, Start menu, top bar, tray and the app windows. Test ids only. */
export class DesktopPage {
  readonly taskbar: Locator
  readonly topBar: Locator

  constructor(readonly page: Page) {
    this.taskbar = page.getByTestId('taskbar')
    this.topBar = page.getByTestId('topbar')
  }

  // ---- Start menu and windows ---------------------------------------------------------------

  async openStart(): Promise<void> {
    if (!(await this.page.getByTestId('start-menu').isVisible())) await this.page.getByTestId('taskbar-start').click()
    await this.page.getByTestId('start-menu').waitFor()
  }

  /** Opens an app from the Start menu and waits for its window. `chat` starts a new chat. */
  async openApp(app: AppId): Promise<Locator> {
    await this.openStart()
    const group = START_GROUP[app]
    if (group && !(await this.page.getByTestId(`start-menu-item-${app}`).isVisible())) await this.page.getByTestId(`start-menu-group-${group}`).click()
    const before = await this.windows(app).count()
    await this.page.getByTestId(`start-menu-item-${app}`).click()
    const created = this.windows(app).nth(before)
    await created.waitFor()
    return created
  }

  /** Opens Computer (Explorer) from the Start menu "places" column. */
  async openComputer(): Promise<ExplorerWindow> {
    await this.openStart()
    const before = await this.windows('explorer').count()
    await this.page.getByTestId('start-menu-place-computer').click()
    const created = this.windows('explorer').nth(before)
    await created.waitFor()
    return new ExplorerWindow(created)
  }

  /** Opens Help and Support from the Start menu "places" column. */
  async openHelp(): Promise<Locator> {
    await this.openStart()
    await this.page.getByTestId('start-menu-place-help').click()
    const created = this.windows('help').first()
    await created.waitFor()
    return created
  }

  /** All windows of an app, oldest first. */
  windows(app: AppId): Locator {
    return this.page.getByTestId(`window-${app}`)
  }

  window(app: AppId, index = 0): Locator {
    return this.windows(app).nth(index)
  }

  async closeWindow(app: AppId, index = 0): Promise<void> {
    await this.window(app, index).getByTestId('window-close').click()
  }

  /** Brings a window to the front (click on its title bar); new windows open over the others. */
  async focusWindow(app: AppId, index = 0): Promise<void> {
    await this.window(app, index).getByTestId('window-title').click()
  }

  async minimizeWindow(app: AppId, index = 0): Promise<void> {
    await this.window(app, index).getByTestId('window-minimize').click()
  }

  taskbarItem(app: AppId): Locator {
    return this.page.getByTestId(`taskbar-item-${app}`)
  }

  explorer(index = 0): ExplorerWindow {
    return new ExplorerWindow(this.window('explorer', index))
  }

  code(index = 0): CodeWindow {
    return new CodeWindow(this.window('code', index))
  }

  codeReview(index = 0): CodeReviewWindow {
    return new CodeReviewWindow(this.window('code-review', index))
  }

  terminal(index = 0): TerminalWindow {
    return new TerminalWindow(this.window('terminal', index))
  }

  /** The chat pane of an app window. */
  aside(app: AppId, index = 0): AsidePane {
    return new AsidePane(this.window(app, index))
  }

  chat(index = 0): ChatWindow {
    return new ChatWindow(this.window('chat', index))
  }

  // ---- top bar -----------------------------------------------------------------------------

  /** The "Agent can use" chip of a tool group (`terminal`, `fs.read`, ...; dots become dashes in the id). */
  toolChip(group: string): Locator {
    return this.page.getByTestId(`topbar-tool-chip-${group.replaceAll('.', '-')}`)
  }

  get toolChips(): Locator {
    return this.page.getByTestId('topbar-tool-chips')
  }

  get pauseButton(): Locator {
    return this.page.getByTestId('topbar-pause')
  }

  get status(): Locator {
    return this.page.getByTestId('topbar-status')
  }

  // ---- tray: USB, Action Center ---------------------------------------------------------------

  get usbTray(): Locator {
    return this.page.getByTestId('usb-tray')
  }

  /** Safely Remove: tray icon, then "Eject <drive>". A confirm box (chats on the drive) is left to the caller. */
  async ejectDrive(letter: string): Promise<void> {
    await this.usbTray.click()
    await this.page.getByTestId(`usb-eject-${letter.toLowerCase()}`).click()
  }

  get autoPlay(): Locator {
    return this.page.getByTestId('autoplay-dialog')
  }

  get actionCenter(): Locator {
    return this.page.getByTestId('action-center')
  }

  get actionCenterFlag(): Locator {
    return this.page.getByTestId('action-center-flag')
  }

  async openActionCenter(): Promise<void> {
    if (!(await this.actionCenter.isVisible())) await this.actionCenterFlag.click()
    await this.actionCenter.waitFor()
  }

  /** The approval row of the Action Center (open it first). */
  get approvals(): Locator {
    return this.page.getByTestId('action-center-approval')
  }

  /** The UAC-style review dialog, and its "Allow" button. */
  get uac(): Locator {
    return this.page.getByTestId('uac-dialog')
  }

  get uacAllow(): Locator {
    return this.page.getByTestId('uac-allow')
  }
}
