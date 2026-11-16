import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { Id } from '@shared/models'
import { publishWindowState } from './registerWindowHandlers'

/** Session partition of every Browser app `<webview>`: cookies and logins persist across restarts. */
export const BROWSER_PARTITION = 'persist:agent7-browser'

const isWebAddress = (src: string | undefined): boolean => !src || src === 'about:blank' || /^https?:\/\//i.test(src)

/** Locks down `<webview>` guests: no preload, no node, our partition, web addresses only. */
function secureWebviews(window: BrowserWindow): void {
  window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    params.partition = BROWSER_PARTITION
    if (!isWebAddress(params.src)) event.preventDefault()
  })
  window.webContents.on('did-attach-webview', (_event, guest) => {
    // target="_blank" and window.open stay in the same page instead of spawning OS windows.
    guest.setWindowOpenHandler(({ url }) => {
      if (isWebAddress(url)) void guest.loadURL(url)
      return { action: 'deny' }
    })
  })
}

/** One frameless OS window; `loadDesktop` fills it. */
export function createDesktopWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Agent7',
    frame: false,
    backgroundColor: '#1e5aa8',
    icon: join(__dirname, '../../resources/icon-256.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webviewTag: true
    }
  })
  publishWindowState(window)
  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  secureWebviews(window)
  return window
}

/** Loads the renderer with `?desktop=<id>` (no query: the first-run page without a desktop). */
export function loadDesktop(window: BrowserWindow, desktopId: Id | null): void {
  const query: Record<string, string> = desktopId === null ? {} : { desktop: String(desktopId) }
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    void window.loadURL(url.href)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}
