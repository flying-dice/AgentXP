import { webContents } from 'electron'
import type { Id } from '@shared/models'
import type { DesktopState } from '@shared/desktop'
import type { SenderHandler } from './registerIpcHandlers'

export interface DesktopHandlerDeps {
  windows: { desktopOf(sender: Electron.WebContents): Id | null }
  desktops: { state(desktopId: Id): DesktopState }
  browsers: { attach(windowId: Id, contents: Electron.WebContents): void }
}

/** `desktop.*` calls that depend on the calling window. */
export function desktopSenderHandlers({ windows, desktops, browsers }: DesktopHandlerDeps): Record<string, SenderHandler> {
  return {
    'desktop.current': async (sender) => {
      const id = windows.desktopOf(sender)
      return id === null ? null : desktops.state(id)
    },
    // Only a <webview> hosted by the calling window may be attached (it cannot claim another window's page).
    'desktop.attachBrowser': async (sender, windowId, webContentsId) => {
      if (typeof windowId !== 'number' || typeof webContentsId !== 'number') throw new Error('attachBrowser needs a window id and a webContents id')
      const desktopId = windows.desktopOf(sender)
      const owns = desktopId !== null && desktops.state(desktopId).windows.some((w) => w.id === windowId && w.app === 'browser')
      if (!owns) throw new Error(`Window ${windowId} is not a Browser window of this desktop`)
      const guest = webContents.fromId(webContentsId)
      if (!guest || guest.hostWebContents?.id !== sender.id) throw new Error('That page does not belong to this window')
      browsers.attach(windowId, guest)
    }
  }
}
