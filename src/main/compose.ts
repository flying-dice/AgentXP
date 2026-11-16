import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from './infrastructure/db/sql'
import { A2uiService } from './application/A2uiService'
import { AguiRunCoordinator } from './application/agui/AguiRunCoordinator'
import { AppRequestBroker } from './application/desktop/AppRequestBroker'
import { StickyNoteService } from './application/desktop/StickyNoteService'
import { ProtocolEventLog } from './application/events/ProtocolEventLog'
import { RecycleService } from './application/RecycleService'
import { DesktopService } from './application/desktop/DesktopService'
import { createMemoryWindowHost, type DesktopWindowHost } from './application/desktop/ports'
import { LauncherService, type ApprovalNotifier } from './application/launcher/LauncherService'
import { ThumbnailService, type ThumbnailCapturer } from './application/launcher/ThumbnailService'
import { SessionFiles } from './application/SessionFiles'
import { ToolPaths } from './application/tools/ToolPaths'
import { DriveService } from './application/vfs/DriveService'
import { VirtualFileSystem } from './application/vfs/VirtualFileSystem'
import { ToolGateway } from './application/desktop/ToolGateway'
import { AgentConnectionPool } from './application/AgentConnectionPool'
import { CompositeA2uiSink } from './application/CompositeA2uiSink'
import { SessionEventBus } from './application/SessionEventBus'
import { AgentService } from './application/AgentService'
import { ChangeReverter } from './application/ChangeReverter'
import { FileChangeRecorder } from './application/FileChangeRecorder'
import { FanOutEventPublisher } from './application/FanOutEventPublisher'
import { FolderService } from './application/FolderService'
import { PermissionBroker } from './application/PermissionBroker'
import type {
  A2uiMcpConfigFactory,
  AgentConnector,
  EventPublisher,
  FilePicker,
  FolderPicker,
  ScreenCapturer,
  PathOpener,
  TextFileSaver
} from './application/ports'
import { ProcessService } from './application/ProcessService'
import { createBrowserTools } from './application/tools/browserTools'
import { createEventsTools } from './application/tools/eventsTools'
import { createNotesTools } from './application/tools/notesTools'
import { createPaintTools } from './application/tools/paintTools'
import { createRecycleTools } from './application/tools/recycleTools'
import { createSnipTools } from './application/tools/snipTools'
import { createWordpadTools } from './application/tools/wordpadTools'
import { createCodeTools } from './application/tools/codeTools'
import { DesktopToolService } from './application/tools/DesktopToolService'
import { createFsTools } from './application/tools/fsTools'
import { createNotepadTools } from './application/tools/notepadTools'
import type { CommandRunner } from './application/tools/ports'
import { createShellTools } from './application/tools/shellTools'
import { createTerminalTools } from './application/tools/terminalTools'
import { SessionBroadcaster } from './application/SessionBroadcaster'
import { SessionEventProjector } from './application/SessionEventProjector'
import { SessionQueryService } from './application/SessionQueryService'
import { SessionRuntime } from './application/SessionRuntime'
import { SessionService } from './application/SessionService'
import { ShellService } from './application/ShellService'
import { TerminalRecorder } from './application/TerminalRecorder'
import { TranscriptExporter } from './application/TranscriptExporter'
import { A2uiBridgeServer, buildA2uiMcpServerConfig } from './infrastructure/a2ui/bridge-server'
import { AcpAgentConnector } from './infrastructure/acp/AcpAgentConnector'
import { ElectronBrowserDriver } from './infrastructure/browser/ElectronBrowserDriver'
import { ShellCommandRunner } from './infrastructure/process/ShellCommandRunner'
import { SqliteAppWindowRepository } from './infrastructure/db/sqlite-app-window-repository'
import { SqliteDesktopRepository } from './infrastructure/db/sqlite-desktop-repository'
import { SqliteDriveRepository } from './infrastructure/db/sqlite-drive-repository'
import { SqliteToolPolicyRepository } from './infrastructure/db/sqlite-tool-policy-repository'
import { SqliteA2uiSurfaceRepository } from './infrastructure/db/sqlite-a2ui-surface-repository'
import { SqliteAgentRepository } from './infrastructure/db/sqlite-agent-repository'
import { SqliteFileChangeRepository } from './infrastructure/db/sqlite-file-change-repository'
import { SqliteFolderRepository } from './infrastructure/db/sqlite-folder-repository'
import { SqlitePermissionRepository } from './infrastructure/db/sqlite-permission-repository'
import { SqliteSessionRepository } from './infrastructure/db/sqlite-session-repository'
import { SqliteRecycledChangeRepository } from './infrastructure/db/sqlite-recycled-change-repository'
import { SqliteStickyNoteRepository } from './infrastructure/db/sqlite-sticky-note-repository'
import { SqliteTaskRepository } from './infrastructure/db/sqlite-task-repository'
import { SqliteTerminalRepository } from './infrastructure/db/sqlite-terminal-repository'
import { SqliteTranscriptRepository } from './infrastructure/db/sqlite-transcript-repository'
import { FileThumbnailStore } from './infrastructure/fs/FileThumbnailStore'
import { NodeFolderBrowser } from './infrastructure/fs/NodeFolderBrowser'
import { NodeHostFiles } from './infrastructure/fs/NodeHostFiles'
import { NodeWorkspaceFileSystem } from './infrastructure/fs/NodeWorkspaceFileSystem'
import { createApi } from './ipc/createApi'
import type { InvokeApi } from '../shared/ipc-channels'

export interface ComposeOptions {
  db: Database
  publisher: EventPublisher
  picker: FolderPicker
  saver: TextFileSaver
  opener: PathOpener
  /** Native multi-file picker for attachments; defaults to "nothing picked". */
  filePicker?: FilePicker
  /** Reported by `app.version()`. */
  appVersion?: string
  /** How the A2UI MCP server is launched by agents. */
  a2uiMcp: { electronPath: string; scriptPath: string }
  /** Defaults to spawning real ACP agent processes. */
  connector?: AgentConnector
  /** The OS windows of desktops and the launcher; defaults to an in-memory host (tests). */
  windows?: DesktopWindowHost
  /** `<userData>/desktops`: each desktop's C: disk and thumbnail live in `<desktopsDir>/<id>/`. Defaults to a fresh temp folder (tests). */
  desktopsDir?: string
  /** Takes the launcher thumbnails; defaults to none (tests). */
  thumbnailCapturer?: ThumbnailCapturer
  /** Tells the user a disconnected desktop needs approval; defaults to silence (tests). */
  notifier?: ApprovalNotifier
  /** Runs `terminal_run`; defaults to the platform shell. */
  commandRunner?: CommandRunner
  /** Captures the desktop window for `snip.capture` / `screen_capture`; defaults to refusing (tests). */
  screen?: ScreenCapturer
}

export interface AppServices {
  api: InvokeApi
  sessions: SessionService
  /** The AG-UI backend: the renderer's view on sessions (run / resume / connect), streamed over IPC. */
  agui: AguiRunCoordinator
  /** Agent events of every session (extension point for additional front ends). */
  events: SessionEventBus
  a2uiSink: CompositeA2uiSink
  broker: PermissionBroker
  a2ui: A2uiService
  /** Desktops, their windows and the tools that follow the apps. */
  desktops: DesktopService
  /** The launcher: desktops as long-lived projects (connect, disconnect, create, delete). */
  launcher: LauncherService
  /** The drives (C: and USB projects) of every desktop and the virtual file system over them. */
  drives: DriveService
  vfs: VirtualFileSystem
  /** Launcher thumbnails (a PNG per desktop in its app-data folder). */
  thumbnails: ThumbnailService
  thumbnailStore: FileThumbnailStore
  /** Protocol events of every desktop (Event Viewer); the AG-UI IPC transport feeds it. */
  eventLog: ProtocolEventLog
  /** The Browser app's pages; main attaches each `<webview>` here (`desktop.attachBrowser`). */
  browsers: ElectronBrowserDriver
  /** Starts the A2UI bridge and cleans up state left by a previous run. */
  start(): Promise<void>
  /** Disposes agent connections (and their terminals) and the bridge. Does not close the database. */
  shutdown(): Promise<void>
}

/** Wires repositories, services and adapters. The only place that knows every concrete class. */
export function composeApp(options: ComposeOptions): AppServices {
  const { db } = options
  // Services publish through this; the renderer-facing events go on to `options.publisher`, the rest feed the AG-UI backend.
  const publisher = new FanOutEventPublisher(options.publisher)
  const repos = {
    agents: new SqliteAgentRepository(db),
    folders: new SqliteFolderRepository(db),
    sessions: new SqliteSessionRepository(db),
    transcripts: new SqliteTranscriptRepository(db),
    tasks: new SqliteTaskRepository(db),
    changes: new SqliteFileChangeRepository(db),
    terminals: new SqliteTerminalRepository(db),
    permissions: new SqlitePermissionRepository(db),
    surfaces: new SqliteA2uiSurfaceRepository(db),
    desktops: new SqliteDesktopRepository(db),
    drives: new SqliteDriveRepository(db),
    windows: new SqliteAppWindowRepository(db),
    toolPolicies: new SqliteToolPolicyRepository(db),
    notes: new SqliteStickyNoteRepository(db),
    recycled: new SqliteRecycledChangeRepository(db)
  }
  const fileSystem = new NodeWorkspaceFileSystem()
  const desktopsDir = options.desktopsDir ?? mkdtempSync(join(tmpdir(), 'agent7-desktops-'))
  const hostFiles = new NodeHostFiles()
  const folderService = new FolderService(repos.folders, new NodeFolderBrowser(), options.picker, publisher, fileSystem)
  const drives = new DriveService({ drives: repos.drives, folders: repos.folders, desktops: repos.desktops, pickFolder: () => folderService.pick() })
  const vfs = new VirtualFileSystem({ host: hostFiles, folders: repos.folders, drives, desktopsDir })
  const broadcaster = new SessionBroadcaster(repos.sessions, publisher)
  const changeRecorder = new FileChangeRecorder(repos.changes, publisher)
  const sessionFiles = new SessionFiles({ vfs, host: hostFiles, sessions: repos.sessions, recorder: changeRecorder })
  const broker = new PermissionBroker(repos.permissions, repos.transcripts, publisher, broadcaster)
  const pool = new AgentConnectionPool()
  const eventBus = new SessionEventBus()
  const projector = new SessionEventProjector(repos.sessions, repos.transcripts, repos.tasks, publisher, broadcaster)
  eventBus.subscribe((sessionId, event) => projector.apply(sessionId, event))

  let a2uiBridge: A2uiBridgeServer | null = null
  const a2uiMcpConfig: A2uiMcpConfigFactory = (sessionId) => {
    if (!a2uiBridge) throw new Error('The A2UI bridge is not running')
    const desktopId = repos.sessions.get(sessionId)?.desktopId
    const config = buildA2uiMcpServerConfig({
      ...options.a2uiMcp,
      socketPath: a2uiBridge.socketPath,
      sessionKey: String(sessionId),
      desktopId: desktopId === null || desktopId === undefined ? undefined : String(desktopId)
    })
    return {
      kind: 'stdio',
      name: config.name,
      command: config.command,
      args: config.args,
      env: Object.fromEntries(config.env.map((e) => [e.name, e.value]))
    }
  }

  const runtime = new SessionRuntime({
    connector: options.connector ?? new AcpAgentConnector(),
    pool,
    sessions: repos.sessions,
    agents: repos.agents,
    vfs,
    events: eventBus,
    broker,
    files: sessionFiles,
    terminals: new TerminalRecorder(repos.terminals, publisher),
    broadcaster,
    a2uiMcpConfig,
    toolGate: (sessionId) => gateway.forSession(sessionId),
    protocolTap: (sessionId) => eventLog.acpTap(sessionId)
  })
  const eventLog = new ProtocolEventLog({
    desktopOfSession: (sessionId) => repos.sessions.get(sessionId)?.desktopId ?? null,
    events: publisher
  })
  const sessions = new SessionService({
    sessions: repos.sessions,
    agents: repos.agents,
    vfs,
    transcripts: repos.transcripts,
    surfaces: repos.surfaces,
    permissions: repos.permissions,
    pool,
    runtime,
    broadcaster,
    events: publisher,
    desktopContext: { contextOfSession: (id) => desktops.contextOfSession(id) }
  })
  const desktops = new DesktopService({
    desktops: repos.desktops,
    windows: repos.windows,
    policies: repos.toolPolicies,
    agents: repos.agents,
    sessions: repos.sessions,
    notes: repos.notes,
    chats: sessions,
    drives,
    events: publisher
  })
  const windowHost = options.windows ?? createMemoryWindowHost()
  const thumbnailStore = new FileThumbnailStore(desktopsDir)
  const thumbnails = new ThumbnailService({
    store: thumbnailStore,
    capturer: options.thumbnailCapturer ?? { capturePng: async () => null },
    connected: () => windowHost.connectedIds(),
    updated: () => launcher.publishChanged()
  })
  const launcher = new LauncherService({
    desktops: repos.desktops,
    sessions: repos.sessions,
    agents: repos.agents,
    drives,
    vfs,
    desktopService: desktops,
    chats: sessions,
    pendingApprovals: () => broker.pendingRequests(),
    host: windowHost,
    thumbnails,
    notifier: options.notifier ?? { approvalNeeded: () => {} },
    clearLog: (desktopId) => eventLog.clear(desktopId),
    events: publisher
  })
  drives.observe((desktopId) => {
    desktops.refresh(desktopId)
    launcher.publishChanged()
  })
  broker.observe((change) => {
    if (change.kind === 'requested') launcher.onApprovalRequested(change.request.sessionId)
    else launcher.publishChanged()
  })
  const gateway = new ToolGateway({ desktops, broker, events: eventBus })
  const a2ui = new A2uiService(repos.surfaces, repos.transcripts, repos.sessions, publisher, sessions)
  const a2uiSink = new CompositeA2uiSink(a2ui)
  const toolPaths = new ToolPaths(vfs, repos.sessions)
  const browsers = new ElectronBrowserDriver()
  const appRequests = new AppRequestBroker(publisher)
  const notes = new StickyNoteService({ notes: repos.notes, events: publisher, desktops })
  const screen: ScreenCapturer = options.screen ?? {
    capture: () => Promise.reject(new Error('Screen capture is not available here.'))
  }
  const recycle = new RecycleService(repos.recycled, repos.sessions, vfs, hostFiles, changeRecorder, publisher)
  const desktopTools = new DesktopToolService({
    states: desktops,
    gate: gateway,
    handlers: {
      ...createShellTools({ desktops, paths: toolPaths, ask: (sessionId, title, reason) => gateway.ask(sessionId, title, reason) }),
      ...createFsTools({ vfs, paths: toolPaths }),
      ...createNotepadTools({ desktops, vfs, paths: toolPaths }),
      ...createCodeTools({ desktops, changes: repos.changes, paths: toolPaths }),
      ...createTerminalTools({ desktops, runner: options.commandRunner ?? new ShellCommandRunner(), vfs, paths: toolPaths }),
      ...createBrowserTools({ desktops, driver: browsers }),
      ...createPaintTools({ desktops, requests: appRequests }),
      ...createWordpadTools({
        desktops,
        vfs,
        paths: toolPaths,
        requests: appRequests,
        files: { write: (sessionId, path, text) => sessionFiles.writeVPath(sessionId, path, text) }
      }),
      ...createNotesTools({ notes }),
      ...createEventsTools({ log: eventLog }),
      ...createSnipTools({ desktops, screen }),
      ...createRecycleTools({ recycle })
    },
    log: {
      called: (context, tool, args) => eventLog.recordToolCall(context, tool, args),
      finished: (context, tool, result, refused) => eventLog.recordToolResult(context, tool, result, refused)
    }
  })
  a2uiBridge = new A2uiBridgeServer(a2uiSink, undefined, undefined, desktopTools)

  const queries = new SessionQueryService(
    repos.sessions,
    repos.transcripts,
    repos.tasks,
    repos.changes,
    repos.terminals,
    repos.surfaces,
    desktops
  )
  const agui = new AguiRunCoordinator({ queries, sessions, a2ui, broker, events: eventBus, appEvents: publisher })

  const api = createApi({
    agents: new AgentService(repos.agents),
    folders: folderService,
    sessions,
    queries,
    broker,
    reverter: new ChangeReverter(repos.changes, repos.sessions, vfs, hostFiles, changeRecorder, repos.recycled, publisher),
    exporter: new TranscriptExporter(repos.sessions, repos.transcripts, options.saver),
    a2ui,
    desktops,
    vfs,
    drives,
    launcher,
    processes: new ProcessService(pool, repos.sessions, repos.agents, broadcaster),
    shell: new ShellService(options.opener),
    files: options.filePicker ?? { pickFiles: async () => [] },
    appRequests,
    notes,
    eventLog,
    recycle,
    screen,
    appVersion: options.appVersion ?? '0.0.0'
  })

  const bridge = a2uiBridge
  // Desktop changes: the MCP children refresh their tool lists; chat titles follow session renames.
  publisher.subscribe((message) => {
    if (message.name === 'desktop.changed') bridge.publishTools(message.payload.desktopId, message.payload.tools)
    else if (message.name === 'session.changed') {
      desktops.onSessionChanged(message.payload)
      launcher.publishChanged()
    } else if (message.name === 'session.removed') {
      desktops.onSessionRemoved()
      launcher.publishChanged()
    }
  })
  return {
    api,
    sessions,
    agui,
    events: eventBus,
    a2uiSink,
    broker,
    a2ui,
    desktops,
    launcher,
    drives,
    vfs,
    thumbnails,
    thumbnailStore,
    eventLog,
    browsers,
    start: async () => {
      sessions.recoverAfterRestart()
      launcher.resetConnections()
      await bridge.start()
      thumbnails.start()
    },
    shutdown: async () => {
      thumbnails.stop()
      agui.dispose()
      appRequests.dispose()
      eventLog.dispose()
      await pool.disposeAll()
      await bridge.stop()
    }
  }
}
