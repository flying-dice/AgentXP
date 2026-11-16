import type { BrowserWindow, WebContents } from 'electron'
import type { Id } from '@shared/models'
import type { DesktopWindowHost } from '../application/desktop/ports'

export interface WindowFactory {
  /** A frameless desktop window (not shown until ready). */
  createDesktop(): BrowserWindow
  loadDesktop(window: BrowserWindow, desktopId: Id): void
  /** The small fixed-size launcher window. */
  createLauncher(): BrowserWindow
  loadLauncher(window: BrowserWindow): void
}

export interface WindowCallbacks {
  /** The user closed a desktop window (the desktop is now disconnected). Not called when the app quits or `close()` was used. */
  onClosed(desktopId: Id): void
  /** The user is closing a desktop window: take its thumbnail now. Closing waits for it (briefly). */
  beforeClose(desktopId: Id): Promise<void>
}

/** How long closing a desktop window waits for its thumbnail. */
const THUMBNAIL_WAIT_MS = 1500

/**
 * The OS windows: one per connected desktop plus the launcher. Closing a desktop window only disconnects it
 * (the services keep its agents running). Knows which window shows which desktop so events and calls reach the right one.
 */
export class DesktopWindowManager implements DesktopWindowHost {
  private readonly windows = new Map<Id, BrowserWindow>()
  private launcher: BrowserWindow | null = null
  private quitting = false

  constructor(
    private readonly factory: WindowFactory,
    private readonly callbacks: WindowCallbacks
  ) {}

  open(desktopId: Id): void {
    const existing = this.windows.get(desktopId)
    if (existing && !existing.isDestroyed()) return this.reveal(existing)
    const window = this.trackDesktop(desktopId, this.factory.createDesktop())
    this.windows.set(desktopId, window)
    this.factory.loadDesktop(window, desktopId)
  }

  /** Closes without the "closed by the user" callback (disconnect, delete). */
  close(desktopId: Id): void {
    const window = this.windows.get(desktopId)
    this.windows.delete(desktopId)
    if (window && !window.isDestroyed()) window.destroy()
  }

  connectedIds(): Id[] {
    return [...this.windows].filter(([, w]) => !w.isDestroyed()).map(([id]) => id)
  }

  showLauncher(): void {
    if (this.launcher && !this.launcher.isDestroyed()) return this.reveal(this.launcher)
    const window = this.factory.createLauncher()
    this.launcher = window
    window.once('closed', () => {
      if (this.launcher === window) this.launcher = null
    })
    this.factory.loadLauncher(window)
  }

  hasWindows(): boolean {
    return this.connectedIds().length > 0 || (this.launcher !== null && !this.launcher.isDestroyed())
  }

  /** The desktop shown by the window that owns `sender`; null in the launcher window. */
  desktopOf(sender: WebContents): Id | null {
    for (const [id, window] of this.windows) if (!window.isDestroyed() && window.webContents.id === sender.id) return id
    return null
  }

  /** The renderer of a desktop's window. */
  webContentsOf(desktopId: Id): WebContents | null {
    const window = this.windows.get(desktopId)
    return window && !window.isDestroyed() ? window.webContents : null
  }

  launcherContents(): WebContents | null {
    return this.launcher && !this.launcher.isDestroyed() ? this.launcher.webContents : null
  }

  /** While the app quits, closing windows must not run the disconnect flow. */
  markQuitting(): void {
    this.quitting = true
  }

  private reveal(window: BrowserWindow): void {
    if (window.isMinimized()) window.restore()
    window.show()
    window.moveTop()
    window.focus()
  }

  private trackDesktop(desktopId: Id, window: BrowserWindow): BrowserWindow {
    let capturing = false
    window.on('close', (event) => {
      // First close request: delay it until the thumbnail is taken (the window is gone afterwards).
      if (this.quitting || capturing || this.windows.get(desktopId) !== window) return
      capturing = true
      event.preventDefault()
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, THUMBNAIL_WAIT_MS))
      void Promise.race([this.callbacks.beforeClose(desktopId).catch(() => {}), timeout]).then(() => {
        if (!window.isDestroyed()) window.close()
      })
    })
    window.once('closed', () => {
      if (this.windows.get(desktopId) !== window) return // closed through `close()`
      this.windows.delete(desktopId)
      if (!this.quitting) this.callbacks.onClosed(desktopId)
    })
    return window
  }
}
