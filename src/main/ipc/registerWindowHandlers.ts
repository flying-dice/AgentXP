import { BrowserWindow, ipcMain } from 'electron'
import { WINDOW_CHANNELS } from '../../shared/ipc-channels'
import type { WindowStateDto } from '../../shared/ipc'

const stateOf = (window: BrowserWindow): WindowStateDto => ({ maximized: window.isMaximized(), focused: window.isFocused() })

/** Pushes maximize / unmaximize / focus / blur changes of a window to its renderer. */
export function publishWindowState(window: BrowserWindow): void {
  const push = (): void => {
    if (!window.isDestroyed()) window.webContents.send(WINDOW_CHANNELS.state, stateOf(window))
  }
  window.on('maximize', push)
  window.on('unmaximize', push)
  window.on('focus', push)
  window.on('blur', push)
}

/** Caption button handlers of the frameless window; they act on the window that sent the call. */
export function registerWindowHandlers(): () => void {
  const target = (sender: Electron.WebContents): BrowserWindow | null => BrowserWindow.fromWebContents(sender)
  ipcMain.handle(WINDOW_CHANNELS.minimize, (event) => target(event.sender)?.minimize())
  ipcMain.handle(WINDOW_CHANNELS.toggleMaximize, (event) => {
    const window = target(event.sender)
    if (window) window.isMaximized() ? window.unmaximize() : window.maximize()
  })
  ipcMain.handle(WINDOW_CHANNELS.close, (event) => target(event.sender)?.close())
  ipcMain.handle(WINDOW_CHANNELS.getState, (event) => {
    const window = target(event.sender)
    return window ? stateOf(window) : { maximized: false, focused: true }
  })
  return () => {
    for (const channel of [WINDOW_CHANNELS.minimize, WINDOW_CHANNELS.toggleMaximize, WINDOW_CHANNELS.close, WINDOW_CHANNELS.getState]) {
      ipcMain.removeHandler(channel)
    }
  }
}
