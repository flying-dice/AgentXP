import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { composeApp, type AppServices } from './compose'
import { openDatabase } from './infrastructure/db/open-database'
import { createDesktopWindow, createLauncherWindow, loadDesktop, loadLauncher } from './ipc/createDesktopWindow'
import { DesktopWindowManager } from './ipc/DesktopWindowManager'
import { registerAguiHandlers } from './ipc/registerAguiHandlers'
import { desktopSenderHandlers } from './ipc/registerDesktopHandlers'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { registerWindowHandlers } from './ipc/registerWindowHandlers'
import { ElectronFilePicker, ElectronFolderPicker, ElectronPathOpener, ElectronTextFileSaver } from './ipc/ElectronDialogs'
import { ElectronScreenCapturer } from './ipc/ElectronScreenCapturer'
import { ElectronEventPublisher } from './ipc/ElectronEventPublisher'
import { ElectronNotifier } from './ipc/ElectronNotifier'
import { ElectronThumbnailCapturer, handleThumbnailScheme, registerThumbnailScheme } from './ipc/ElectronThumbnails'

// Tests (and the smoke script) redirect all app data to a temp folder.
const userDataOverride = process.env['AGENT7_USER_DATA']
if (userDataOverride) app.setPath('userData', userDataOverride)

// Thumbnails reach the launcher renderer over a custom protocol (registered before `ready`).
registerThumbnailScheme()

const databasePath = (): string => process.env['AGENT7_DB_PATH'] ?? join(app.getPath('userData'), 'agent7.sqlite')

interface Running {
  windows: DesktopWindowManager
  services: AppServices
  shutdown(): Promise<void>
}

/** Composition root: opens the database, builds the services and wires IPC. */
async function bootstrap(): Promise<Running> {
  const db = openDatabase(databasePath())
  let services: AppServices | null = null
  // Closing a desktop window only disconnects it: the services (agents, turns, permission requests) keep running.
  const windows = new DesktopWindowManager(
    { createDesktop: createDesktopWindow, loadDesktop, createLauncher: createLauncherWindow, loadLauncher },
    {
      onClosed: (desktopId) => services?.launcher.windowClosed(desktopId),
      beforeClose: (desktopId) => services?.thumbnails.captureNow(desktopId) ?? Promise.resolve()
    }
  )
  services = composeApp({
    db,
    publisher: new ElectronEventPublisher({
      webContentsOf: (desktopId) => windows.webContentsOf(desktopId),
      all: () => BrowserWindow.getAllWindows().map((w) => w.webContents)
    }),
    windows,
    desktopsDir: join(app.getPath('userData'), 'desktops'),
    thumbnailCapturer: new ElectronThumbnailCapturer(windows),
    notifier: new ElectronNotifier((desktopId) => services?.launcher.connect(desktopId)),
    screen: new ElectronScreenCapturer(windows),
    picker: new ElectronFolderPicker(),
    nativePicker: process.env.AGENT7_NATIVE_PICKER === '1',
    filePicker: new ElectronFilePicker(),
    saver: new ElectronTextFileSaver(),
    opener: new ElectronPathOpener(),
    appVersion: app.getVersion(),
    a2uiMcp: { electronPath: process.execPath, scriptPath: join(__dirname, 'a2ui-mcp.js') },
    // The scripted ACP agent (agents/scripted-agent) runs on the app's own Electron in node mode; its sample scripts are
    // copied next to it (out/main/scripts), so `--script demo` resolves in dev, built and packaged runs alike.
    builtinAgents: [
      {
        name: 'Scripted Agent',
        command: process.execPath,
        args: [join(__dirname, 'scripted-agent.js'), '--script', 'demo'],
        env: { ELECTRON_RUN_AS_NODE: '1' }
      }
    ]
  })
  const running = services
  await running.start()
  handleThumbnailScheme(running.thumbnailStore)
  const unregister = registerIpcHandlers(
    running.api,
    desktopSenderHandlers({ windows, desktops: running.desktops, browsers: running.browsers })
  )
  const unregisterAguiHandlers = registerAguiHandlers(running.agui, {
    validate: is.dev,
    onEvent: (input, event) => {
      const sessionId = Number(input.threadId)
      if (Number.isSafeInteger(sessionId)) running.eventLog.recordAgui(sessionId, event)
    }
  })
  const unregisterWindow = registerWindowHandlers()
  return {
    windows,
    services: running,
    shutdown: async () => {
      unregister()
      unregisterAguiHandlers()
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
  // Starting Agent7 opens the launcher; desktops are connected from there.
  running.windows.showLauncher()
  app.on('activate', () => {
    if (running && !running.windows.hasWindows()) running.windows.showLauncher()
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

// Closing the launcher while desktops are connected keeps the app (and the agents) running; closing the last
// window quits (agents stop). On macOS the app stays until Cmd+Q, and a click on the dock icon shows the launcher.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
