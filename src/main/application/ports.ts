import type { A2uiSurfaceDto } from '@shared/a2ui'
import type {
  AgentDto,
  ContentBlockDto,
  FileChangeDto,
  FileNodeDto,
  Id,
  SessionModeDto,
  SessionModelDto,
  TaskDto,
  TerminalDto,
  TranscriptEntryDto
} from '@shared/models'
import type { AgentXpEvents } from '@shared/ipc'
import type { AgentSessionEventSink } from '../domain/agent/AgentSessionEventSink'
import type { FileAccess, FileAccessProvider } from '../domain/agent/FileAccess'
import type { McpServerConfig } from '../domain/agent/McpServerConfig'
import type { PermissionPrompter } from '../domain/agent/PermissionPrompter'

/**
 * Events that stay inside the main process. The AG-UI backend translates them into the AG-UI
 * stream; they are never sent to the renderer directly.
 */
export interface InternalEvents {
  'transcript.upserted': { sessionId: Id; entry: TranscriptEntryDto }
  'transcript.cleared': { sessionId: Id }
  'tasks.changed': { sessionId: Id; tasks: TaskDto[] }
  'changes.changed': { sessionId: Id; changes: FileChangeDto[] }
  'terminal.changed': TerminalDto
  'surface.changed': A2uiSurfaceDto
  'surface.removed': { sessionId: Id; surfaceId: string }
}

/** Every event services publish: the renderer-facing ones plus the internal ones. */
export type AppEvents = AgentXpEvents & InternalEvents
export type AppEventName = keyof AppEvents

/** Publishes application events (the Electron adapter forwards the renderer-facing ones to windows). */
export interface EventPublisher {
  publish<K extends AppEventName>(event: K, payload: AppEvents[K]): void
}

/** Native "choose a folder" dialog. Resolves to the chosen path or null when cancelled. */
export interface FolderPicker {
  pickFolder(): Promise<string | null>
}

/** Native "save as" dialog plus writing. Resolves to the saved path or null when cancelled. */
export interface TextFileSaver {
  saveText(defaultName: string, content: string): Promise<string | null>
}

export interface PathOpener {
  open(path: string): Promise<void>
}

/** Read-only view of a registered folder; every path is relative to `root` and sandboxed to it. */
export interface FolderBrowser {
  /** One directory level, folders first, `.git` and `node_modules` ignored. */
  list(root: string, relativePath: string): Promise<FileNodeDto[]>
  readText(root: string, relativePath: string): Promise<string>
}

/** Creates sandboxed file access for a folder and removes files inside it. */
export interface WorkspaceFileSystem {
  access(root: string, onWrite?: (absolutePath: string, before: string | null, after: string) => void): FileAccess
  remove(root: string, relativePath: string): Promise<void>
}

export interface TerminalActivity {
  terminalId: string
  command: string
  args: string[]
  cwd: string | null
  /** Text appended since the previous activity. */
  delta: string
  exitStatus: { exitCode: number | null; signal: string | null } | null
}

/** Everything an agent connection needs from the harness, already bound to one session row. */
export interface ConnectionHandlers {
  sink: AgentSessionEventSink
  permissions: PermissionPrompter
  files: FileAccessProvider
  onTerminalActivity(activity: TerminalActivity): void
}

export interface AgentLaunch {
  agent: AgentDto
  cwd: string
  handlers: ConnectionHandlers
}

export interface AcpSessionState {
  modes: SessionModeDto[]
  models: SessionModelDto[]
  currentModeId: string | null
  currentModelId: string | null
}

export interface OpenedAcpSession extends AcpSessionState {
  acpSessionId: string
}

export type StopReason = 'end_turn' | 'max_tokens' | 'max_turn_requests' | 'refusal' | 'cancelled'

/** One live agent (process + protocol connection) serving exactly one session. */
export interface LiveAgentConnection {
  readonly canLoadSession: boolean
  /** Resolves when the agent went away (crash or dispose). */
  readonly closed: Promise<void>
  newSession(cwd: string, mcpServers: McpServerConfig[]): Promise<OpenedAcpSession>
  loadSession(acpSessionId: string, cwd: string, mcpServers: McpServerConfig[]): Promise<AcpSessionState>
  prompt(acpSessionId: string, blocks: ContentBlockDto[]): Promise<StopReason>
  cancel(acpSessionId: string): Promise<void>
  setMode(acpSessionId: string, modeId: string): Promise<void>
  setModel(acpSessionId: string, modelId: string): Promise<void>
  dispose(): Promise<void>
}

/** Spawns an agent and performs the protocol handshake. */
export interface AgentConnector {
  open(launch: AgentLaunch): Promise<LiveAgentConnection>
}

/** Builds the MCP server entry that lets an agent draw A2UI surfaces for one session. */
export type A2uiMcpConfigFactory = (sessionId: Id) => McpServerConfig
