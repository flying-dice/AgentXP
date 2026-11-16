/**
 * The typed contract between renderer and main. The preload script exposes
 * an object implementing `AgentXpApi` as `window.agentxp`. Every invoke
 * method maps 1:1 to an `ipcMain.handle` channel named after the key path
 * (e.g. `sessions.create`); every event maps to a `webContents.send` channel.
 */
import type {
  AgentDto,
  FileChangeDto,
  FileNodeDto,
  FolderDto,
  Id,
  SessionDto,
  TaskDto,
  TerminalDto,
  TranscriptEntryDto
} from './models'
import type { A2uiClientEvent, A2uiSurfaceDto } from './a2ui'

export interface PromptInput {
  sessionId: Id
  text: string
  /** Absolute paths attached as resource links. */
  attachments: string[]
}

export interface AgentInput {
  name: string
  command: string
  args: string[]
  env: Record<string, string>
}

export interface AgentXpApi {
  agents: {
    list(): Promise<AgentDto[]>
    create(input: AgentInput): Promise<AgentDto>
    update(id: Id, input: AgentInput): Promise<AgentDto>
    remove(id: Id): Promise<void>
    setDefault(id: Id): Promise<void>
  }
  folders: {
    list(): Promise<FolderDto[]>
    /** Shows the native folder picker; returns null when cancelled. */
    pick(): Promise<FolderDto | null>
    add(path: string): Promise<FolderDto>
    remove(id: Id): Promise<void>
    /** Lists one directory level, sorted folders first; ignores .git and node_modules. */
    readDir(folderId: Id, relativePath: string): Promise<FileNodeDto[]>
    readFile(folderId: Id, relativePath: string): Promise<string>
  }
  sessions: {
    list(folderId?: Id): Promise<SessionDto[]>
    get(id: Id): Promise<SessionDto>
    /** Creates the row, spawns the agent and opens an ACP session. */
    create(folderId: Id, agentId?: Id): Promise<SessionDto>
    rename(id: Id, title: string): Promise<void>
    remove(id: Id): Promise<void>
    transcript(id: Id): Promise<TranscriptEntryDto[]>
    tasks(id: Id): Promise<TaskDto[]>
    changes(id: Id): Promise<FileChangeDto[]>
    terminals(id: Id): Promise<TerminalDto[]>
    surfaces(id: Id): Promise<A2uiSurfaceDto[]>
    prompt(input: PromptInput): Promise<void>
    cancel(id: Id): Promise<void>
    setMode(id: Id, modeId: string): Promise<void>
    setModel(id: Id, modelId: string): Promise<void>
    respondPermission(requestId: Id, optionId: string | null): Promise<void>
    revertChange(changeId: Id): Promise<void>
    clearTranscript(id: Id): Promise<void>
    exportTranscript(id: Id): Promise<string | null>
  }
  a2ui: {
    dispatch(event: A2uiClientEvent): Promise<void>
  }
  shell: {
    openPath(path: string): Promise<void>
  }
  on<K extends keyof AgentXpEvents>(event: K, listener: (payload: AgentXpEvents[K]) => void): () => void
}

/** Push events from main to renderer. */
export interface AgentXpEvents {
  'session.changed': SessionDto
  'session.removed': { id: Id }
  'transcript.upserted': { sessionId: Id; entry: TranscriptEntryDto }
  'transcript.cleared': { sessionId: Id }
  'tasks.changed': { sessionId: Id; tasks: TaskDto[] }
  'changes.changed': { sessionId: Id; changes: FileChangeDto[] }
  'terminal.changed': TerminalDto
  'surface.changed': A2uiSurfaceDto
  'surface.removed': { sessionId: Id; surfaceId: string }
  'folders.changed': FolderDto[]
  'status.message': { text: string }
}

export type AgentXpEventName = keyof AgentXpEvents
