import type { BrowserWindow, WebContents } from 'electron'
import type { Id } from '@shared/models'
import type { DesktopWindowHost } from '../application/desktop/ports'

export interface WindowFactory {
  create(): BrowserWindow
  load(window: BrowserWindow, desktopId: Id | null): void
}

/**
 * One OS window per open desktop, plus at most one blank window (no desktop yet: first launch).
 * Knows which window shows which desktop so events and calls reach the right one.
 */
export class DesktopWindowManager implements DesktopWindowHost {
  private readonly windows = new Map<Id, BrowserWindow>()
  private blank: BrowserWindow | null = null
  private quitting = false

  constructor(
    private readonly factory: WindowFactory,
    /** An OS window of a desktop was closed by the user (not by quitting). */
    private readonly onClosed: (desktopId: Id) => void
  ) {}

  open(desktopId: Id): void {
    const existing = this.windows.get(desktopId)
    if (existing && !existing.isDestroyed()) return this.reveal(existing)
    // The first-run window becomes the desktop's window instead of staying blank next to it.
    const window = this.blank && !this.blank.isDestroyed() ? this.blank : this.track(this.factory.create())
    this.blank = null
    this.windows.set(desktopId, window)
    this.factory.load(window, desktopId)
  }

  openBlank(): void {
    if (this.blank && !this.blank.isDestroyed()) return this.reveal(this.blank)
    this.blank = this.track(this.factory.create())
    this.factory.load(this.blank, null)
  }

  close(desktopId: Id): void {
    const window = this.windows.get(desktopId)
    this.windows.delete(desktopId) // not a "user closed it": the desktop is going away
    if (window && !window.isDestroyed()) window.destroy()
  }

  hasWindows(): boolean {
    return this.windows.size > 0 || this.blank !== null
  }

  /** The desktop shown by the window that owns `sender`; null in the blank window. */
  desktopOf(sender: WebContents): Id | null {
    for (const [id, window] of this.windows) if (!window.isDestroyed() && window.webContents.id === sender.id) return id
    return null
  }

  /** The renderer of a desktop's window. */
  webContentsOf(desktopId: Id): WebContents | null {
    const window = this.windows.get(desktopId)
    return window && !window.isDestroyed() ? window.webContents : null
  }

  /** While the app quits, closing windows must not mark desktops closed (they reopen next launch). */
  markQuitting(): void {
    this.quitting = true
  }

  private reveal(window: BrowserWindow): void {
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  private track(window: BrowserWindow): BrowserWindow {
    window.once('closed', () => {
      if (this.blank === window) this.blank = null
      // Closing the last window quits the app (except on macOS): that desktop stays open for the next launch.
      const quitsApp = this.windows.size === 1 && process.platform !== 'darwin'
      for (const [id, w] of this.windows) {
        if (w !== window) continue
        this.windows.delete(id)
        if (!this.quitting && !quitsApp) this.onClosed(id)
      }
    })
    return window
  }
}
