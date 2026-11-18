/**
 * The typed contract between renderer and main. The preload script exposes
 * an object implementing `AgentXPApi` as `window.agentxp`. Every invoke
 * method maps 1:1 to an `ipcMain.handle` channel named after the key path
 * (e.g. `sessions.create`); every event maps to a `webContents.send` channel.
 */
import type { BaseEvent, RunAgentInput } from '@ag-ui/core'
import type {
  AgentDto,
  FileChangeDto,
  BrowseListingDto,
  FileNodeDto,
  FolderDto,
  Id,
  SessionDto,
  SessionModeDto,
  SessionModelDto,
  TaskDto,
  TerminalDto,
  TranscriptEntryDto
} from './models'
import type { A2uiClientEvent, A2uiSurfaceDto, A2uiSurfaceTarget } from './a2ui'
import type { AgentProcessDto, DesktopApi, DesktopEvents, DesktopExtrasApi } from './desktop'
import type { DrivesApi, LauncherApi, LauncherEvents, VPath, VfsApi } from './vfs'
import type { GitApi, GitEvents } from './git'
import type { ReviewApi, ReviewEvents } from './review'
import type { KanbanApi, KanbanEvents } from './kanban'
import type { McpApi, ProfilesApi, RoomsApi, SkillsApi, TeamsApi, TeamsEvents } from './teams'
import type { SchedulerApi, SchedulerEvents } from './scheduler'
import type { NoticeEvents } from './notices'
import type { FollowEvents } from './follow'
import type { ShowEvents } from './show'

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
  defaultModeId?: string | null
  defaultModelId?: string | null
}

export interface AgentChoicesDto {
  modes: SessionModeDto[]
  models: SessionModelDto[]
}

/** What main sends on the `agui.event` channel: one AG-UI event of one run. */
export interface AguiEventMessage {
  runId: string
  event: BaseEvent
}

/**
 * AG-UI over IPC. The renderer is the AG-UI client, main is the agent backend.
 * Call `onEvent(runId, ...)` before `run(input)` so no event is missed; the
 * stream ends with RUN_FINISHED or RUN_ERROR and `run` resolves after it.
 */
export interface AguiApi {
  run(input: RunAgentInput): Promise<void>
  /** Cancels the turn running in the session `threadId` (the ACP turn ends as cancelled). */
  abort(threadId: string, runId: string): Promise<void>
  onEvent(runId: string, listener: (event: BaseEvent) => void): () => void
}

/** Frame state of the main window, pushed on maximize / unmaximize / focus / blur. */
export interface WindowStateDto {
  maximized: boolean
  focused: boolean
}

/** Window chrome control for the frameless main window. */
export interface WindowApi {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  /** Current state (the first push may predate the renderer's listener). */
  getState(): Promise<WindowStateDto>
  onStateChanged(listener: (state: WindowStateDto) => void): () => void
}

export interface AgentXPApi {
  agents: {
    list(): Promise<AgentDto[]>
    create(input: AgentInput): Promise<AgentDto>
    update(id: Id, input: AgentInput): Promise<AgentDto>
    remove(id: Id): Promise<void>
    setDefault(id: Id, desktopId?: Id): Promise<void>
    /** True when `command` is a program that can be started (the Add Agent dialog's Test button). */
    check(command: string): Promise<boolean>
    /** Starts a temporary ACP session to discover this command's available choices. */
    discover(input: AgentInput): Promise<AgentChoicesDto>
  }
  folders: {
    list(): Promise<FolderDto[]>
    /** Shows the native folder dialog (only with `AGENTXP_NATIVE_PICKER=1`; the app uses `fs.browse`); returns null when cancelled. */
    pick(): Promise<FolderDto | null>
    add(path: string): Promise<FolderDto>
    remove(id: Id): Promise<void>
    /** Lists one directory level, sorted folders first; ignores .git and node_modules. */
    readDir(folderId: Id, relativePath: string): Promise<FileNodeDto[]>
    readFile(folderId: Id, relativePath: string): Promise<string>
    /** Current git branch (or short commit when detached) read from `.git/HEAD`; null when the folder is not a repository. */
    gitBranch(folderId: Id): Promise<string | null>
    /** Writes a text file the user saved (Notepad, WordPad). Recorded as a user edit, not an agent change. */
    writeFile(folderId: Id, relativePath: string, text: string): Promise<void>
  }
  sessions: {
    /** Chats of one desktop, or of all. */
    list(desktopId?: Id): Promise<SessionDto[]>
    get(id: Id): Promise<SessionDto>
    /** Creates the row, spawns the agent in `cwd` (a VPath, default `AGENT_HOME`) and opens an ACP session. */
    create(desktopId: Id, agentId?: Id, cwd?: VPath): Promise<SessionDto>
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
    /**
     * Takes back the last message of the chat when the agent never answered it (a send that failed), so sending it
     * again does not duplicate it. Resolves false when the last entry is not an unanswered message of the user.
     */
    retry(id: Id): Promise<boolean>
    /** Ends the chat's agent program (if any) and starts a fresh one: "Reconnect", "Restart and send again". */
    restartAgent(id: Id): Promise<void>
    exportTranscript(id: Id): Promise<string | null>
  }
  a2ui: {
    dispatch(event: A2uiClientEvent): Promise<void>
    /** The chat row's Delete: removes the surface like the agent's a2ui_delete_surface (its window closes). */
    deleteSurface(sessionId: Id, surfaceId: string): Promise<void>
    /** The chat row's Move to: relocates the surface (to `window` its window opens, away from it the window closes). */
    moveSurface(sessionId: Id, surfaceId: string, target: A2uiSurfaceTarget): Promise<void>
    /** Closes (true) or reopens (false) the sidebar tab of a surface. */
    setSidebarHidden(sessionId: Id, surfaceId: string, hidden: boolean): Promise<void>
  }
  shell: {
    openPath(path: string): Promise<void>
  }
  fs: {
    /** The sub-folders of a folder on the user's disk (folders only). '' lists the drives (or `/`) and the shortcuts. */
    browse(path: string): Promise<BrowseListingDto>
    /** Creates a folder below `parent` (named `name`, made unique) and resolves its path. */
    makeFolder(parent: string, name: string): Promise<string>
    /** True when the native folder dialog replaces the in-app Browse For Folder dialog (`AGENTXP_NATIVE_PICKER=1`). */
    nativePicker(): Promise<boolean>
  }
  dialogs: {
    /** Shows the native open-file dialog (multi-select); resolves to the chosen absolute paths, empty when cancelled. */
    pickFiles(): Promise<string[]>
  }
  desktop: DesktopApi
  vfs: VfsApi
  git: GitApi
  review: ReviewApi
  scheduler: SchedulerApi
  drives: DrivesApi
  launcher: LauncherApi
  skills: SkillsApi
  mcp: McpApi
  profiles: ProfilesApi
  teams: TeamsApi
  rooms: RoomsApi
  notes: DesktopExtrasApi['notes']
  kanban: KanbanApi
  events: DesktopExtrasApi['events']
  recycle: DesktopExtrasApi['recycle']
  snip: DesktopExtrasApi['snip']
  processes: {
    /** Running agent processes across all desktops (Agent Manager). */
    list(): Promise<AgentProcessDto[]>
    /** Ends the agent process; its chats close. */
    end(agentId: Id, desktopId: Id): Promise<void>
  }
  app: {
    /** The application version (package.json). */
    version(): Promise<string>
  }
  window: WindowApi
  agui: AguiApi
  on<K extends keyof AgentXPEvents>(event: K, listener: (payload: AgentXPEvents[K]) => void): () => void
}

/**
 * Push events from main to renderer. Transcript, tasks, changes, terminals and
 * A2UI surfaces are not here: they travel in the AG-UI stream (`AguiApi`).
 * What remains feeds the session list and the status bar.
 */
export interface AgentXPEvents extends DesktopEvents, LauncherEvents, GitEvents, ReviewEvents, KanbanEvents, TeamsEvents, SchedulerEvents, NoticeEvents, ShowEvents, FollowEvents {
  'session.changed': SessionDto
  'session.removed': { id: Id }
  'folders.changed': FolderDto[]
  /** The transcript was cleared: the chat's AG-UI store reloads (empty messages and state). */
  'transcript.cleared': { sessionId: Id }
  /** Settings outside a desktop changed (an agent tool did it): open Control Center and Teams windows reload that area. */
  'config.changed': { area: ConfigArea }
}

/** The settings areas that `config.changed` names. */
export type ConfigArea = 'agents' | 'skills' | 'mcp' | 'profiles' | 'teams'

export type AgentXPEventName = keyof AgentXPEvents
