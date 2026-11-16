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

/**
 * One desktop OS window; `loadDesktop` fills it. It keeps the native title bar (the OS draws the frame, so maximize and
 * full screen follow the OS rules without a gap); Agent7's own connection bar sits below it.
 */
export function createDesktopWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Agent7',
    frame: true,
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

/** The launcher: small, fixed size, frameless (the renderer draws the caption). */
export function createLauncherWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 520,
    height: 600,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Agent7',
    frame: false,
    backgroundColor: '#1e5aa8',
    icon: join(__dirname, '../../resources/icon-256.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })
  publishWindowState(window)
  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  return window
}

/** Loads the renderer with `?desktop=<id>` (a desktop window) or `?launcher=1` (the launcher). */
export const loadDesktop = (window: BrowserWindow, desktopId: Id): void => loadRenderer(window, { desktop: String(desktopId) })
export const loadLauncher = (window: BrowserWindow): void => loadRenderer(window, { launcher: '1' })

function loadRenderer(window: BrowserWindow, query: Record<string, string>): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    void window.loadURL(url.href)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}
