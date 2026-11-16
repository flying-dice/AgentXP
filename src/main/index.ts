import { join } from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { composeApp, type AppServices } from './compose'
import { openDatabase } from './infrastructure/db/open-database'
import { registerAguiHandlers } from './ipc/registerAguiHandlers'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { ElectronFolderPicker, ElectronPathOpener, ElectronTextFileSaver } from './ipc/ElectronDialogs'
import { ElectronEventPublisher } from './ipc/ElectronEventPublisher'

// Tests (and the smoke script) redirect all app data to a temp folder.
const userDataOverride = process.env['AGENT7_USER_DATA']
if (userDataOverride) app.setPath('userData', userDataOverride)

const databasePath = (): string => process.env['AGENT7_DB_PATH'] ?? join(app.getPath('userData'), 'agent7.sqlite')

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Agent7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })
  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

/** Composition root: opens the database, builds the services and wires IPC. */
async function bootstrap(): Promise<() => Promise<void>> {
  const db = openDatabase(databasePath())
  const services: AppServices = composeApp({
    db,
    publisher: new ElectronEventPublisher(),
    picker: new ElectronFolderPicker(),
    saver: new ElectronTextFileSaver(),
    opener: new ElectronPathOpener(),
    a2uiMcp: { electronPath: process.execPath, scriptPath: join(__dirname, 'a2ui-mcp.js') }
  })
  await services.start()
  const unregister = registerIpcHandlers(services.api)
  const unregisterAgui = registerAguiHandlers(services.agui, { validate: is.dev })
  return async () => {
    unregister()
    unregisterAgui()
    await services.shutdown()
    db.close()
  }
}

let shutdown: (() => Promise<void>) | null = null
let shuttingDown = false

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.flyingdice.agent7')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  shutdown = await bootstrap()
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
}).catch((error: unknown) => {
  dialog.showErrorBox('Agent7 could not start', error instanceof Error ? error.message : String(error))
  app.exit(1)
})

app.on('before-quit', (event) => {
  if (shuttingDown || !shutdown) return
  event.preventDefault()
  shuttingDown = true
  void shutdown().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
