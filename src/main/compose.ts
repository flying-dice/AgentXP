import { ensureBuiltinAgents, type BuiltinAgent } from './application/BuiltinAgents'
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
import { ToolCallDiffs } from './application/vfs/ToolCallDiffs'
import { ToolPaths } from './application/tools/ToolPaths'
import { DriveService } from './application/vfs/DriveService'
import { VirtualFileSystem } from './application/vfs/VirtualFileSystem'
import { GitService } from './application/git/GitService'
import { ReviewService } from './application/review/ReviewService'
import { createReviewTools } from './application/tools/reviewTools'
import { SqliteReviewRepository } from './infrastructure/db/sqlite-review-repository'
import type { GitCli } from './application/git/ports'
import { ExecGitCli } from './infrastructure/git/ExecGitCli'
import { ToolGateway } from './application/desktop/ToolGateway'
import { AgentConnectionPool } from './application/AgentConnectionPool'
import { CompositeA2uiSink } from './application/CompositeA2uiSink'
import { ToolCallPaths } from './application/vfs/ToolCallPaths'
import { SessionEventBus } from './application/SessionEventBus'
import { AgentService } from './application/AgentService'
import { NodeCommandLocator } from './infrastructure/process/NodeCommandLocator'
import { ChangeReverter } from './application/ChangeReverter'
import { FileChangeRecorder } from './application/FileChangeRecorder'
import { FanOutEventPublisher } from './application/FanOutEventPublisher'
import { FolderService } from './application/FolderService'
import { PermissionBroker } from './application/PermissionBroker'
import type {
  A2uiMcpConfigFactory,
  AgentConnector,
  EventPublisher,
  DirectoryBrowser,
  ProgramFinder,
  FilePicker,
  FolderPicker,
  ScreenCapturer,
  PathOpener,
  TextFileSaver
} from './application/ports'
import { ProcessService } from './application/ProcessService'
import { OsProcessUsage } from './infrastructure/process/osProcessUsage'
import { createBrowserTools } from './application/tools/browserTools'
import { createEventsTools } from './application/tools/eventsTools'
import { createNotesTools } from './application/tools/notesTools'
import { createBoardTools } from './application/tools/boardTools'
import { KanbanService } from './application/kanban/KanbanService'
import { SqliteKanbanRepository } from './infrastructure/db/sqlite-kanban-repository'
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
import { ProblemAwareSessions, SessionProblems } from './application/SessionProblems'
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
import { NodeDirectoryBrowser } from './infrastructure/fs/NodeDirectoryBrowser'
import { PathProgramFinder } from './infrastructure/fs/PathProgramFinder'
import { NodeFolderBrowser } from './infrastructure/fs/NodeFolderBrowser'
import { NodeHostFiles } from './infrastructure/fs/NodeHostFiles'
import { NodeWorkspaceFileSystem } from './infrastructure/fs/NodeWorkspaceFileSystem'
import { createApi } from './ipc/createApi'
import type { InvokeApi } from '../shared/ipc-channels'

export interface ComposeOptions {
  db: Database
  publisher: EventPublisher
  /** The native folder dialog; only used when `nativePicker` is set (the app shows its own Browse For Folder dialog). */
  picker: FolderPicker
  /** Lists folders for the in-app Browse For Folder dialog; defaults to the real disk. */
  directories?: DirectoryBrowser
  /** Looks agent commands up for the launcher's start-error check; defaults to the PATH of this process. */
  programs?: ProgramFinder
  /** `AGENT7_NATIVE_PICKER=1`: the renderer asks the native dialog instead of the in-app one. */
  nativePicker?: boolean
  saver: TextFileSaver
  opener: PathOpener
  /** Native multi-file picker for attachments; defaults to "nothing picked". */
  filePicker?: FilePicker
  /** Reported by `app.version()`. */
  appVersion?: string
  /** How the A2UI MCP server is launched by agents. */
  a2uiMcp: { electronPath: string; scriptPath: string }
  /** Agents seeded on start (idempotent), e.g. the bundled Scripted Agent. Defaults to none (tests). */
  builtinAgents?: readonly BuiltinAgent[]
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
  /** Runs the `git` CLI for the Code app's git awareness; defaults to the real `git`. */
  git?: GitCli
  /** Poll interval of `git.changed` while a Code window is open (ms); default 5000, 0 disables. */
  gitPollMs?: number
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
  const problems = new SessionProblems()
  const repos = {
    agents: new SqliteAgentRepository(db),
    folders: new SqliteFolderRepository(db),
    // Every reader of a session row sees what is wrong with its agent program (could not start, stopped).
    sessions: new ProblemAwareSessions(new SqliteSessionRepository(db), problems),
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
    recycled: new SqliteRecycledChangeRepository(db),
    kanban: new SqliteKanbanRepository(db),
    reviews: new SqliteReviewRepository(db)
  }
  const fileSystem = new NodeWorkspaceFileSystem()
  const desktopsDir = options.desktopsDir ?? mkdtempSync(join(tmpdir(), 'agent7-desktops-'))
  const hostFiles = new NodeHostFiles()
  const folderService = new FolderService(repos.folders, new NodeFolderBrowser(), options.picker, publisher, fileSystem)
  const drives = new DriveService({ drives: repos.drives, folders: repos.folders, desktops: repos.desktops, pickFolder: () => folderService.pick() })
  const vfs = new VirtualFileSystem({ host: hostFiles, folders: repos.folders, drives, desktopsDir })
  const gitCli = options.git ?? new ExecGitCli()
  const git = new GitService({
    vfs,
    cli: gitCli,
    events: publisher,
    codeDesktops: () => windowHost.connectedIds().filter((id) => desktops.windowsOf(id, 'code').length > 0 || desktops.windowsOf(id, 'code-review').length > 0),
    pollMs: options.gitPollMs
  })
  const broadcaster = new SessionBroadcaster(repos.sessions, publisher)
  const changeRecorder = new FileChangeRecorder(repos.changes, publisher)
  const sessionFiles = new SessionFiles({ vfs, host: hostFiles, sessions: repos.sessions, recorder: changeRecorder })
  const callPaths = new ToolCallPaths(vfs, (sessionId) => repos.sessions.get(sessionId)?.desktopId)
  const broker = new PermissionBroker(repos.permissions, repos.transcripts, publisher, broadcaster, (sessionId, toolCall) => callPaths.patch(sessionId, toolCall), new ToolCallDiffs(vfs, (sessionId) => repos.sessions.get(sessionId)?.desktopId))
  const pool = new AgentConnectionPool()
  const eventBus = new SessionEventBus((sessionId, event) => callPaths.event(sessionId, event))
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

  const terminalRecorder = new TerminalRecorder(repos.terminals, publisher)
  const runtime = new SessionRuntime({
    connector: options.connector ?? new AcpAgentConnector(),
    pool,
    sessions: repos.sessions,
    agents: repos.agents,
    vfs,
    events: eventBus,
    broker,
    files: sessionFiles,
    terminals: terminalRecorder,
    broadcaster,
    problems,
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
    problems,
    desktopContext: { contextOfSession: (id) => desktops.contextOfSession(id) }
  })
  const desktops = new DesktopService({
    desktops: repos.desktops,
    windows: repos.windows,
    policies: repos.toolPolicies,
    agents: repos.agents,
    sessions: repos.sessions,
    notes: repos.notes,
    surfaces: repos.surfaces,
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
    programs: options.programs ?? new PathProgramFinder(),
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
  const reviews = new ReviewService({ reviews: repos.reviews, sessions: repos.sessions, vfs, cli: gitCli, events: publisher, states: desktops })
  const a2ui = new A2uiService(repos.surfaces, repos.transcripts, repos.sessions, publisher, sessions)
  a2ui.attachWindows({
    open: (sessionId, surfaceId, by, size) => desktops.openSurfaceWindow(sessionId, surfaceId, by, size) !== null,
    close: (sessionId, surfaceId) => void desktops.closeSurfaceWindow(sessionId, surfaceId),
    isOpen: (sessionId, surfaceId) => desktops.hasSurfaceWindow(sessionId, surfaceId),
    refresh: (sessionId) => {
      const desktopId = repos.sessions.get(sessionId)?.desktopId
      if (desktopId != null) desktops.refresh(desktopId)
    }
  })
  const a2uiSink = new CompositeA2uiSink(a2ui)
  const toolPaths = new ToolPaths(vfs, repos.sessions)
  const browsers = new ElectronBrowserDriver()
  const appRequests = new AppRequestBroker(publisher)
  const notes = new StickyNoteService({ notes: repos.notes, events: publisher, desktops })
  const kanban = new KanbanService({ kanban: repos.kanban, events: publisher })
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
      ...createTerminalTools({ desktops, runner: options.commandRunner ?? new ShellCommandRunner(), vfs, paths: toolPaths, terminals: terminalRecorder }),
      ...createBrowserTools({ desktops, driver: browsers, requests: appRequests }),
      ...createPaintTools({ desktops, requests: appRequests }),
      ...createWordpadTools({
        desktops,
        vfs,
        paths: toolPaths,
        requests: appRequests,
        files: { write: (sessionId, path, text) => sessionFiles.writeVPath(sessionId, path, text) }
      }),
      ...createNotesTools({ notes }),
      ...createBoardTools({ kanban }),
      ...createEventsTools({ log: eventLog }),
      ...createSnipTools({ desktops, screen }),
      ...createRecycleTools({ recycle }),
      ...createReviewTools({ reviews })
    },
    log: {
      called: (context, tool, args) => eventLog.recordToolCall(context, tool, args),
      finished: (context, tool, result, refused) => eventLog.recordToolResult(context, tool, result, refused)
    }
  })
  a2uiBridge = new A2uiBridgeServer(a2uiSink, undefined, undefined, desktopTools, {
    called: (sessionId, tool, args) => eventLog.recordToolCall({ sessionId }, tool, args),
    finished: (sessionId, tool, result) => eventLog.recordToolResult({ sessionId }, tool, result, false)
  })

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
    agents: new AgentService(repos.agents, new NodeCommandLocator()),
    folders: folderService,
    sessions,
    queries,
    broker,
    reverter: new ChangeReverter(repos.changes, repos.sessions, vfs, hostFiles, changeRecorder, repos.recycled, publisher),
    exporter: new TranscriptExporter(repos.sessions, repos.transcripts, options.saver),
    a2ui,
    desktops,
    vfs,
    git,
    reviews,
    drives,
    launcher,
    processes: new ProcessService(pool, repos.sessions, repos.agents, broadcaster, problems, new OsProcessUsage()),
    shell: new ShellService(options.opener),
    files: options.filePicker ?? { pickFiles: async () => [] },
    directories: options.directories ?? new NodeDirectoryBrowser({ recent: () => folderService.list().map((f) => f.path) }),
    nativePicker: options.nativePicker ?? false,
    appRequests,
    notes,
    kanban,
    eventLog,
    recycle,
    screen,
    appVersion: options.appVersion ?? '0.0.0'
  })

  const bridge = a2uiBridge
  // Desktop changes: the MCP children refresh their tool lists; chat titles follow session renames.
  publisher.subscribe((message) => {
    if (message.name === 'changes.changed') {
      const desktopId = repos.sessions.get(message.payload.sessionId)?.desktopId
      if (desktopId != null) git.touchedDesktop(desktopId)
    } else if (message.name === 'desktop.changed') bridge.publishTools(message.payload.desktopId, message.payload.tools)
    else if (message.name === 'session.changed') {
      desktops.onSessionChanged(message.payload)
      launcher.publishChanged()
    } else if (message.name === 'surface.removed') {
      desktops.onSessionRemoved() // clearing a transcript deletes surfaces and (by trigger) their windows
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
      ensureBuiltinAgents(repos.agents, options.builtinAgents ?? [])
      sessions.recoverAfterRestart()
      launcher.resetConnections()
      await bridge.start()
      thumbnails.start()
      git.start()
    },
    shutdown: async () => {
      thumbnails.stop()
      git.stop()
      agui.dispose()
      appRequests.dispose()
      eventLog.dispose()
      await pool.disposeAll()
      await bridge.stop()
    }
  }
}
