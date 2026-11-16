import type { Database } from './infrastructure/db/sql'
import { A2uiService } from './application/A2uiService'
import { AguiRunCoordinator } from './application/agui/AguiRunCoordinator'
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
  PathOpener,
  TextFileSaver
} from './application/ports'
import { SessionBroadcaster } from './application/SessionBroadcaster'
import { SessionEventProjector } from './application/SessionEventProjector'
import { SessionQueryService } from './application/SessionQueryService'
import { SessionRuntime } from './application/SessionRuntime'
import { SessionService } from './application/SessionService'
import { ShellService } from './application/ShellService'
import { TerminalRecorder } from './application/TerminalRecorder'
import { TranscriptExporter } from './application/TranscriptExporter'
import { WorkspaceFiles } from './application/WorkspaceFiles'
import { A2uiBridgeServer, buildA2uiMcpServerConfig } from './infrastructure/a2ui/bridge-server'
import { AcpAgentConnector } from './infrastructure/acp/AcpAgentConnector'
import { SqliteA2uiSurfaceRepository } from './infrastructure/db/sqlite-a2ui-surface-repository'
import { SqliteAgentRepository } from './infrastructure/db/sqlite-agent-repository'
import { SqliteFileChangeRepository } from './infrastructure/db/sqlite-file-change-repository'
import { SqliteFolderRepository } from './infrastructure/db/sqlite-folder-repository'
import { SqlitePermissionRepository } from './infrastructure/db/sqlite-permission-repository'
import { SqliteSessionRepository } from './infrastructure/db/sqlite-session-repository'
import { SqliteTaskRepository } from './infrastructure/db/sqlite-task-repository'
import { SqliteTerminalRepository } from './infrastructure/db/sqlite-terminal-repository'
import { SqliteTranscriptRepository } from './infrastructure/db/sqlite-transcript-repository'
import { NodeFolderBrowser } from './infrastructure/fs/NodeFolderBrowser'
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
    surfaces: new SqliteA2uiSurfaceRepository(db)
  }
  const fileSystem = new NodeWorkspaceFileSystem()
  const broadcaster = new SessionBroadcaster(repos.sessions, publisher)
  const changeRecorder = new FileChangeRecorder(repos.changes, publisher)
  const broker = new PermissionBroker(repos.permissions, repos.transcripts, publisher, broadcaster)
  const pool = new AgentConnectionPool()
  const eventBus = new SessionEventBus()
  const projector = new SessionEventProjector(repos.sessions, repos.transcripts, repos.tasks, publisher, broadcaster)
  eventBus.subscribe((sessionId, event) => projector.apply(sessionId, event))

  let a2uiBridge: A2uiBridgeServer | null = null
  const a2uiMcpConfig: A2uiMcpConfigFactory = (sessionId) => {
    if (!a2uiBridge) throw new Error('The A2UI bridge is not running')
    const config = buildA2uiMcpServerConfig({
      ...options.a2uiMcp,
      socketPath: a2uiBridge.socketPath,
      sessionKey: String(sessionId)
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
    folders: repos.folders,
    events: eventBus,
    broker,
    workspaceFiles: new WorkspaceFiles(fileSystem, changeRecorder),
    terminals: new TerminalRecorder(repos.terminals, publisher),
    broadcaster,
    a2uiMcpConfig
  })
  const sessions = new SessionService({
    sessions: repos.sessions,
    agents: repos.agents,
    folders: repos.folders,
    transcripts: repos.transcripts,
    surfaces: repos.surfaces,
    permissions: repos.permissions,
    pool,
    runtime,
    broadcaster,
    events: publisher
  })
  const a2ui = new A2uiService(repos.surfaces, repos.transcripts, repos.sessions, publisher, sessions)
  const a2uiSink = new CompositeA2uiSink(a2ui)
  a2uiBridge = new A2uiBridgeServer(a2uiSink)

  const queries = new SessionQueryService(
    repos.sessions,
    repos.transcripts,
    repos.tasks,
    repos.changes,
    repos.terminals,
    repos.surfaces
  )
  const agui = new AguiRunCoordinator({ queries, sessions, a2ui, broker, events: eventBus, appEvents: publisher })

  const api = createApi({
    agents: new AgentService(repos.agents),
    folders: new FolderService(repos.folders, new NodeFolderBrowser(), options.picker, publisher),
    sessions,
    queries,
    broker,
    reverter: new ChangeReverter(repos.changes, repos.sessions, repos.folders, fileSystem, changeRecorder),
    exporter: new TranscriptExporter(repos.sessions, repos.transcripts, options.saver),
    a2ui,
    shell: new ShellService(options.opener),
    files: options.filePicker ?? { pickFiles: async () => [] },
    appVersion: options.appVersion ?? '0.0.0'
  })

  const bridge = a2uiBridge
  return {
    api,
    sessions,
    agui,
    events: eventBus,
    a2uiSink,
    broker,
    a2ui,
    start: async () => {
      sessions.recoverAfterRestart()
      await bridge.start()
    },
    shutdown: async () => {
      agui.dispose()
      await pool.disposeAll()
      await bridge.stop()
    }
  }
}
