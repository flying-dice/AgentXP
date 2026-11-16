import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { composeApp, type AppServices } from './compose'
import { openDatabase } from './infrastructure/db/open-database'
import { createDesktopWindow, loadDesktop } from './ipc/createDesktopWindow'
import { DesktopWindowManager } from './ipc/DesktopWindowManager'
import { registerAguiHandlers } from './ipc/registerAguiHandlers'
import { desktopSenderHandlers } from './ipc/registerDesktopHandlers'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { registerWindowHandlers } from './ipc/registerWindowHandlers'
import { ElectronFilePicker, ElectronFolderPicker, ElectronPathOpener, ElectronTextFileSaver } from './ipc/ElectronDialogs'
import { ElectronScreenCapturer } from './ipc/ElectronScreenCapturer'
import { ElectronEventPublisher } from './ipc/ElectronEventPublisher'

// Tests (and the smoke script) redirect all app data to a temp folder.
const userDataOverride = process.env['AGENT7_USER_DATA']
if (userDataOverride) app.setPath('userData', userDataOverride)

const databasePath = (): string => process.env['AGENT7_DB_PATH'] ?? join(app.getPath('userData'), 'agent7.sqlite')

interface Running {
  windows: DesktopWindowManager
  /** Reopens the desktops that were open last time; without any, shows the first-run window. */
  openInitialWindows(): void
  shutdown(): Promise<void>
}

/** Composition root: opens the database, builds the services and wires IPC. */
async function bootstrap(): Promise<Running> {
  const db = openDatabase(databasePath())
  let services: AppServices | null = null
  const windows = new DesktopWindowManager({ create: createDesktopWindow, load: loadDesktop }, (desktopId) =>
    services?.desktops.windowClosed(desktopId)
  )
  services = composeApp({
    db,
    publisher: new ElectronEventPublisher({
      webContentsOf: (desktopId) => windows.webContentsOf(desktopId),
      all: () => BrowserWindow.getAllWindows().map((w) => w.webContents)
    }),
    windows,
    screen: new ElectronScreenCapturer(windows),
    picker: new ElectronFolderPicker(),
    filePicker: new ElectronFilePicker(),
    saver: new ElectronTextFileSaver(),
    opener: new ElectronPathOpener(),
    appVersion: app.getVersion(),
    a2uiMcp: { electronPath: process.execPath, scriptPath: join(__dirname, 'a2ui-mcp.js') }
  })
  const running = services
  await running.start()
  const unregister = registerIpcHandlers(
    running.api,
    desktopSenderHandlers({ windows, desktops: running.desktops, browsers: running.browsers })
  )
  const unregisterAgui = registerAguiHandlers(running.agui, {
    validate: is.dev,
    onEvent: (input, event) => {
      const sessionId = Number(input.threadId)
      if (Number.isSafeInteger(sessionId)) running.eventLog.recordAgui(sessionId, event)
    }
  })
  const unregisterWindow = registerWindowHandlers()
  return {
    windows,
    openInitialWindows: () => {
      const open = running.desktops.listOpen()
      if (open.length === 0) windows.openBlank()
      for (const desktop of open) windows.open(desktop.id)
    },
    shutdown: async () => {
      unregister()
      unregisterAgui()
      unregisterWindow()
      await running.shutdown()
      db.close()
    }
  }
}

let running: Running | null = null
let shuttingDown = false

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.flyingdice.agent7')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  running = await bootstrap()
  running.openInitialWindows()
  app.on('activate', () => {
    if (running && !running.windows.hasWindows()) running.openInitialWindows()
  })
}).catch((error: unknown) => {
  dialog.showErrorBox('Agent7 could not start', error instanceof Error ? error.message : String(error))
  app.exit(1)
})

app.on('before-quit', (event) => {
  if (shuttingDown || !running) return
  event.preventDefault()
  shuttingDown = true
  running.windows.markQuitting()
  void running.shutdown().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
