/**
 * The desktop contract shared by main and renderer: desktops, app windows,
 * per-app view state, tool groups and the policy that maps open apps to the
 * tools the agent gets. See docs/DESKTOP_DESIGN.md.
 *
 * Pure types, constants and pure functions only.
 */
import type { A2uiSurfaceTarget } from './a2ui'
import type { Id, IsoDate } from './models'
import type { FollowStateDto } from './follow'
import type { AgentIdentity } from './identity'
import type { ShowTarget } from './show'
import type { DriveDto, RemovedProjectDto, VPath } from './vfs'

export const APP_KINDS = [
  'chat',
  'explorer',
  'notepad',
  'code',
  'terminal',
  'browser',
  'control-centre',
  'agent-manager',
  'paint',
  'wordpad',
  'sticky-notes',
  'kanban',
  'diagrams',
  'event-viewer',
  'snipping-tool',
  'recycle-bin',
  'surface',
  'help',
  'code-review',
  'teams',
  'team-chat',
  'task-scheduler'
] as const
export type AppKind = (typeof APP_KINDS)[number]

/** Apps the agent may open or close with desktop_open_app / desktop_close_app. */
export const AGENT_OPENABLE_APPS = [
  'explorer',
  'notepad',
  'code',
  'terminal',
  'browser',
  'paint',
  'wordpad',
  'sticky-notes',
  'kanban',
  'diagrams',
  'event-viewer',
  'snipping-tool',
  'recycle-bin'
] as const satisfies readonly AppKind[]
export type AgentOpenableApp = (typeof AGENT_OPENABLE_APPS)[number]

/** Apps that can have at most one window per desktop. */
export const SINGLETON_APPS: readonly AppKind[] = [
  'code',
  'control-centre',
  'agent-manager',
  'sticky-notes',
  'kanban',
  'event-viewer',
  'snipping-tool',
  'recycle-bin',
  'help',
  'teams',
  'task-scheduler'
]

/** Windows that have no chat pane: Chat is the chat, Code Review has its reviewer panel, a surface is the agent's own UI. */
export const ASIDE_EXCLUDED_APPS: readonly AppKind[] = ['chat', 'code-review', 'surface', 'team-chat']
export const supportsAside = (app: AppKind): boolean => !ASIDE_EXCLUDED_APPS.includes(app)

/** Does this window offer the chat pane now? Task Manager has none on its Chats tab: that list is where a chat is opened (UX-163). */
export const windowHasAside = (w: { app: AppKind; view: AppView }): boolean => supportsAside(w.app) && !(w.view.app === 'agent-manager' && w.view.tab === 'chats')

export type WindowState = 'normal' | 'minimized' | 'maximized'
export type OpenedBy = 'user' | 'agent'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** The Code app's Search tab: what is searched for, below which folder, and how. */
export interface CodeSearchView {
  query: string
  root: VPath
  regex: boolean
  matchCase: boolean
  /** Comma-separated file names or globs; '' searches every file. */
  include: string
  /** Who ran it: the user (Search button) or the agent (code_search). */
  by?: 'user' | 'agent'
  /** Most results to show (the agent's `limit`); the default when absent. */
  limit?: number
  /** When the agent ran it (ms): the same search run again is a new view, so the tab searches again. */
  ranAt?: number
}

/** Explorer's Search Companion: part of the file name and/or a word or phrase in the file, looked for below `root`. */
export interface ExplorerSearchView {
  name: string
  containing: string
  root: VPath
  /** Who ran it: the user (Search button) or the agent (fs_find). */
  by?: 'user' | 'agent'
}

/** Per-app view state: what the window currently shows. Sent to the agent. */
export type AppView =
  | { app: 'chat'; sessionId: Id; title: string }
  /** `path` is a VPath; '' means "Computer" (the drives root, the initial view of a new Explorer). `search`: the Search Companion is open. */
  | { app: 'explorer'; path: VPath | ''; selected: VPath[]; search?: ExplorerSearchView | null }
  | { app: 'notepad'; path: VPath | null; dirty: boolean; caretLine: number }
  | {
      app: 'code'
      tabs: VPath[]
      activePath: VPath | null
      visibleLines: [number, number] | null
      selection: { startLine: number; endLine: number } | null
      selectedChangeId: Id | null
      /** The search the Search tab shows (the user's or the agent's code_search); absent or null: none yet. */
      search?: CodeSearchView | null
    }
  | { app: 'terminal'; terminalId: string | null; cwd: VPath; runningCommand: string | null; lastLines: string[] }
  | { app: 'browser'; url: string; title: string; loading: boolean }
  /** `row`: the Permissions row to select (a tool group id such as `terminal`), set by a top bar chip. */
  | { app: 'control-centre'; page: ControlCentrePage; row?: string }
  | { app: 'agent-manager'; tab?: TaskManagerTab; /** The chat whose row is selected on the Chats tab (set when another window opens Task Manager for it). */ chatId?: Id }
  | { app: 'paint'; path: VPath | null; width: number; height: number; tool: PaintTool; color: string; dirty: boolean }
  | { app: 'wordpad'; path: VPath | null; mode: 'read' | 'edit'; dirty: boolean; visibleHeading: string | null }
  | { app: 'sticky-notes' }
  /** `boardId`: the board shown (null: the first one, or none yet). */
  | { app: 'kanban'; boardId: Id | null; /** A card to select and scroll to (a notice's Open board); absent or null: none. */ selectedCardId?: Id | null }
  /**
   * Agent Diagrams: the drawing (`path` a .xpdiagram VPath, or null when not saved yet), the page shown (0-based) and a
   * short outline of that page, so the agent knows the ids of what it can see.
   */
  | {
      app: 'diagrams'
      path: VPath | null
      title: string
      dirty: boolean
      page: number
      pages: string[]
      shapeCount: number
      connectorCount: number
      selection: string[]
      outline: { shapes: string[]; connectors: string[]; more: number }
    }
  | { app: 'event-viewer'; sessionId: Id | null; level: EventLevel | 'all'; selectedEventId: number | null }
  | { app: 'snipping-tool'; lastSnipId: string | null }
  | { app: 'recycle-bin'; selectedId: Id | null }
  /** An A2UI surface the agent drew with `a2ui_render` (target `window`), one window per surface. */
  | { app: 'surface'; surfaceId: string; sessionId: Id; title: string }
  /** Help and Support: `topic` is the file name of a manual in `manuals` without `.md` (`index` is the home page). */
  | { app: 'help'; topic: string }
  /**
   * Code Review: the working tree at `root` against `baseRef`, with the comments of its review session (`sessionId`,
   * role `review`, owned by this window). `selectedPath` is relative to `root`, with `/`.
   */
  | { app: 'code-review'; root: VPath; baseRef: string; selectedPath: string | null; sessionId: Id; /** A comment to select and scroll to (a notice's Open review); absent or null: none. */ selectedCommentId?: Id | null }
  /** Teams: the profile and team lists, with the editor of the selected one. */
  | { app: 'teams'; tab?: TeamsTab; selectedId?: Id | null }
  /** A team chat room: the members' messages, who is thinking, and the member whose own session is open in the side panel. */
  | { app: 'team-chat'; roomId: Id; title: string; openMemberId?: Id | null }
  /** Task Scheduler: the selected task of the library (null = none) and the tab of its details. */
  | { app: 'task-scheduler'; selectedTaskId: Id | null; tab: SchedulerTab }

export type PaintTool = 'pencil' | 'brush' | 'line' | 'rect' | 'ellipse' | 'fill' | 'text' | 'eraser' | 'picker'
export type EventLevel = 'info' | 'warning' | 'error'

/** The tabs of Task Manager. */
export type TaskManagerTab = 'chats' | 'processes' | 'terminals' | 'performance'
export type ControlCentrePage = 'agents' | 'permissions' | 'skills' | 'appearance' | 'about'
/** The tabs of Teams. */
export type TeamsTab = 'teams' | 'profiles' | 'rooms'
/** The tabs of the details of a scheduled task. */
export type SchedulerTab = 'general' | 'triggers' | 'actions' | 'conditions' | 'settings' | 'history'

export type ViewOf<K extends AppKind> = Extract<AppView, { app: K }>

export interface AppWindowState {
  id: Id
  app: AppKind
  title: string
  bounds: Bounds
  windowState: WindowState
  openedBy: OpenedBy
  /** The agent opened or touched this window behind the chat the user is working in: its taskbar button flashes until it is focused. Absent when false. */
  attention?: boolean
  /** The window's chat pane session (role `aside`), once the first message created it. Absent before. */
  asideSessionId?: Id
  view: AppView
}

/** A desktop row. Desktops are long-lived projects; they are no longer tied to one folder (see `DriveDto`). */
export interface DesktopDto {
  id: Id
  agentId: Id | null
  title: string
  /** True while an OS window shows the desktop ("connected"). */
  isOpen: boolean
  createdAt: IsoDate
}

/** The whole live desktop: AG-UI `state.desktop` and the agent's `desktop_state`. */
export interface DesktopState {
  desktopId: Id
  /** Agent used for new conversations on this desktop; absent in older fixtures. */
  agentId?: Id | null
  title: string
  /** The drives of the desktop: C: first, then the plugged-in USB drives (projects). */
  drives: DriveDto[]
  /** Projects removed from this desktop, newest first (at most five); Computer offers to plug them in again. Absent in older fixtures. */
  removedProjects?: RemovedProjectDto[]
  /** The agent's home directory (`AGENT_HOME`, on C:). */
  home: VPath
  focusedWindowId: Id | null
  /** Back to front. */
  windows: AppWindowState[]
  /** Enabled tool groups (`enabledToolGroups`): every group but those of output apps whose window is closed. */
  tools: ToolGroup[]
  paused: boolean
  /**
   * The chats whose step the last Pause stopped, saved in main (migration 011) so the "Paused" note and the Action
   * Center line do not depend on the window that paused. "Resume agents" continues each of them. Absent in older fixtures.
   */
  stoppedByPause?: Id[]
  /** "Ask before every action": the agent must ask before every action, whatever the permissions say. */
  userInControl: boolean
  /** The Control Center permissions, so the top bar can show what is on, asks or off. Absent in older fixtures. */
  policy?: ToolPolicyDto
  /** The desktop's sticky notes (the agent sees them in `desktop_state`). */
  notes: StickyNoteDto[]
  /** Every A2UI surface of the desktop's chats and where it is shown. */
  surfaces: SurfaceStateDto[]
  /** The chat the operator follows (Follow, `docs/AGENT_PRESENCE.md` section 7); null when none. Absent in older fixtures. */
  following?: FollowStateDto | null
  /**
   * The name and colour of each agent the desktop shows (chats with a window, busy chats, team room members), by
   * session id (`agentIdentity`): the feed rows, the top bar and the cursor use the same one. Absent in older fixtures.
   */
  identities?: Record<string, AgentIdentity>
}

/** Where one A2UI surface is: inline in its chat, in the chat's sidebar or in its own window; `closed` = the user closed the tab or window (it still updates). */
export interface SurfaceStateDto {
  sessionId: Id
  surfaceId: string
  title: string
  target: A2uiSurfaceTarget
  state: 'open' | 'closed'
}

// ---------------------------------------------------------------- tools

export const TOOL_GROUPS = [
  'shell', // desktop_* and a2ui_* (always on)
  'fs.read', // ACP fs/read_text_file, fs_list, fs_find, code_read, code_search
  'fs.write', // ACP fs/write_text_file, code_edit, code_write
  'notepad', // notepad_open, notepad_read
  'show', // show: the agent points the operator at something
  'terminal', // ACP terminal/*, terminal_run, terminal_read
  'browser', // browser_* (the open Browser window)
  'paint', // paint_draw, paint_read, paint_clear, paint_resize (the open Agent Paint window)
  'wordpad', // wordpad_open, wordpad_read, wordpad_write
  'notes', // notes_list, notes_add, notes_update, notes_remove
  'events', // events_query
  'snip', // screen_capture
  'recycle', // recycle_list, recycle_restore
  'board', // board_* (a board is how the agents of a team track work, no window needed)
  'diagrams', // diagram_* (the open Agent Diagrams window)
  'review', // review_list_changes, review_read_diff, review_add_comment, review_submit (the review session of a Code Review window and the chats of its desktop; review_open opens the window)
  'scheduler', // scheduler_* (the Task Scheduler of the desktop)
  'teams', // profile_*, team_* (the profiles and teams of the Teams app)
  'rooms', // room_* (the team chat rooms of the desktop)
  'settings', // settings_*, agent_*, skill_*, mcp_* (Control Center; every change asks the user)
  'taskmgr', // taskmgr_* (the chats, agent programs and terminals that Task Manager shows)
  'help' // help_search, help_read (the manuals of Help and Support)
] as const
export type ToolGroup = (typeof TOOL_GROUPS)[number]

/**
 * Output apps whose tools act on a mounted window (the page of a Browser, the canvas of Agent Paint, the drawing of
 * Agent Diagrams, the review session of a Code Review window). Their groups are enabled only while such a window is
 * open; every other group is always enabled and gated by the Control Center policy alone (`docs/AGENT_PRESENCE.md`).
 */
export const WINDOW_TOOL_GROUPS = {
  browser: 'browser',
  paint: 'paint',
  diagrams: 'diagrams',
  review: 'code-review'
} as const satisfies Partial<Record<ToolGroup, AppKind>>
export type WindowToolGroup = keyof typeof WINDOW_TOOL_GROUPS

export const isWindowToolGroup = (group: ToolGroup): group is WindowToolGroup => group in WINDOW_TOOL_GROUPS

export const APP_DISPLAY_NAMES: Record<AppKind, string> = {
  chat: 'Chat',
  explorer: 'Explorer',
  notepad: 'Notepad',
  code: 'Code',
  terminal: 'Terminal',
  browser: 'Browser',
  'control-centre': 'Control Center',
  'agent-manager': 'Task Manager',
  paint: 'Agent Paint',
  wordpad: 'WordPad',
  'sticky-notes': 'Sticky Notes',
  kanban: 'Kanban',
  diagrams: 'Agent Diagrams',
  'event-viewer': 'Event Viewer',
  'snipping-tool': 'Snipping Tool',
  'recycle-bin': 'Recycle Bin',
  surface: 'Agent window',
  help: 'Help and Support',
  'code-review': 'Code Review',
  teams: 'Teams',
  'team-chat': 'Team Chat',
  'task-scheduler': 'Task Scheduler'
}

/**
 * AppToolPolicy: the tool groups the agent can see. Every group is there, except the groups of output apps whose
 * window is not open (minimised windows count as open).
 */
export function enabledToolGroups(openApps: Iterable<AppKind>): ToolGroup[] {
  const open = new Set(openApps)
  return TOOL_GROUPS.filter((g) => !isWindowToolGroup(g) || open.has(WINDOW_TOOL_GROUPS[g]))
}

/** The message an agent gets when it uses a tool of an output app whose window is not open. */
export function closedAppMessage(group: WindowToolGroup): string {
  if (group === 'review') return 'There is no Code Review window on this desktop. Call review_open with the project path to open one (or the user opens it from the Start menu), then use the review tools.'
  const app = WINDOW_TOOL_GROUPS[group]
  return `The ${APP_DISPLAY_NAMES[app]} app is closed on this desktop. Call desktop_open_app with app "${app}" to open it.`
}

// ---------------------------------------------------------------- permission policy

export type PolicyDecision = 'allow' | 'ask' | 'deny'

/** Control Center permission policy. `openApps` governs every window an agent opens (`DesktopService.openOutputWindow`). */
export interface ToolPolicyDto {
  groups: Record<Exclude<ToolGroup, 'shell'>, PolicyDecision>
  openApps: PolicyDecision
}

export const DEFAULT_TOOL_POLICY: ToolPolicyDto = {
  groups: { 'fs.read': 'allow', 'fs.write': 'ask', notepad: 'allow', show: 'allow', terminal: 'ask', browser: 'allow', paint: 'allow', wordpad: 'ask', notes: 'allow', events: 'allow', snip: 'allow', recycle: 'ask', board: 'allow', diagrams: 'allow', review: 'allow', scheduler: 'ask', teams: 'ask', rooms: 'ask', settings: 'allow', taskmgr: 'allow', help: 'allow' },
  openApps: 'allow'
}

// ---------------------------------------------------------------- AG-UI

/** `RunAgentInput.context[].description` of the desktop context entry. */
export const DESKTOP_CONTEXT_DESCRIPTION = 'agentxp.desktop'
/** URI of the ACP resource block that carries the desktop state into a prompt. */
export const DESKTOP_RESOURCE_URI = 'agentxp://desktop/state'

// ---------------------------------------------------------------- IPC

export interface OpenWindowInput {
  desktopId: Id
  app: AppKind
  /** Initial view hints: a VPath for explorer/notepad/code/wordpad/paint/diagrams, a url for browser, a session for chat, a session and surface id for surface. */
  path?: VPath
  url?: string
  sessionId?: Id
  /** The A2UI surface of a `surface` window (with `sessionId`: the chat that owns it). */
  surfaceId?: string
  /** The topic of a `help` window (a file name in `manuals` without `.md`). */
  topic?: string
  /** The base ref of a `code-review` window (default `HEAD`). */
  baseRef?: string
  /** The file a `code-review` window shows first (a path below its root, with `/`); default: the first changed file. */
  selectedPath?: string
  /** The room of a `team-chat` window. */
  roomId?: Id
  /** Browser: open another window even when one is open (File > New window). Read by the desktop shell; main ignores it. */
  newWindow?: boolean
}

/**
 * "Ask the agent about this": what an app hands to the desktop when the user picks Explain this, Ask the agent about this... or Send
 * selection to chat from a context menu. `DesktopHost.askChat` turns it into a chat prompt; a chat side panel can
 * take the same request later, so the apps never change.
 */
export interface AskChatRequest {
  /** The app the request comes from. */
  app: AppKind
  /** The window it comes from (its drive decides where a new chat works). */
  windowId: Id
  /**
   * explain: "Explain this"; ask: "Ask the agent about this..." (the user adds the question); send: "Send selection to chat"; window: "Start a chat here"
   * (like send, but in a new full chat instead of the window's chat pane).
   */
  kind: 'explain' | 'ask' | 'send' | 'window'
  /** The selected text, the output or the page text. */
  text?: string
  /** The file or folder the request is about (a VPath). */
  path?: VPath
  /** The 1-based, inclusive line range the text covers. */
  range?: { startLine: number; endLine: number }
  /** The page address of a Browser request. */
  url?: string
  /** The page title of a Browser request. */
  title?: string
  /** For kind ask: the question that fills the box after the context ("What does this page say?"), so the user can send it as it is. */
  question?: string
}

/** Calls from inside a desktop window. Listing, creating, opening and deleting desktops is `LauncherApi`. */
export interface DesktopApi {
  /** The desktop shown by this OS window (from the `?desktop=` query); null in the launcher window. */
  current(): Promise<DesktopState | null>
  rename(id: Id, title: string): Promise<void>
  openWindow(input: OpenWindowInput): Promise<AppWindowState>
  closeWindow(windowId: Id): Promise<void>
  focusWindow(windowId: Id): Promise<void>
  setBounds(windowId: Id, bounds: Bounds): Promise<void>
  setWindowState(windowId: Id, state: WindowState): Promise<void>
  /** Debounced by the caller. Transient: not persisted except path/url. */
  updateView(windowId: Id, view: AppView): Promise<void>
  setPaused(desktopId: Id, paused: boolean): Promise<void>
  /**
   * "Resume agents and continue": lifts the pause and returns the chats whose step Pause had stopped (the saved list,
   * which is then cleared) so the caller can send each "Please continue where you stopped.". Empty when nothing was stopped.
   */
  resumeAgents(desktopId: Id): Promise<Id[]>
  setUserInControl(desktopId: Id, on: boolean): Promise<void>
  /** Starts a chat (ACP session) on the desktop and opens its Chat window. `cwd` (a VPath on a plugged-in drive or C:) defaults to `AGENT_HOME`. */
  newChat(desktopId: Id, agentId?: Id, cwd?: VPath): Promise<AppWindowState>
  /**
   * Starts a code review of the folder `root` (a VPath on a plugged-in drive or C:) against `baseRef` (default `HEAD`):
   * creates the review session (role `review`, `cwd` = `root`), opens its Code Review window and asks the agent for a review.
   */
  openReview(desktopId: Id, root: VPath, baseRef?: string, agentId?: Id, selectedPath?: string): Promise<AppWindowState>
  /**
   * The chat pane of an app window (not Chat, Code Review or a surface): returns the id of the window's `aside` session,
   * creating it on the first call (cwd = the window's drive, else the agent's home). The session lives and dies with the
   * window: closing the window deletes it.
   */
  openAside(desktopId: Id, windowId: Id, agentId?: Id): Promise<Id>
  /**
   * "New conversation": the pane starts blank; the next `openAside` starts a fresh session. The conversation it had is
   * kept as a chat (Start > Recent chats) when the user wrote in it, else deleted.
   */
  closeAside(windowId: Id): Promise<void>
  /**
   * "Open as a chat window": moves the pane's conversation to a Chat window of its own (kept as a chat; the pane starts
   * blank). Null when the pane has no conversation yet.
   */
  openAsideAsChat(windowId: Id): Promise<AppWindowState | null>
  policy(): Promise<ToolPolicyDto>
  setPolicy(policy: ToolPolicyDto): Promise<void>
  /**
   * Tells main which guest `webContents` (`webview.getWebContentsId()`) renders the Browser window
   * `windowId`, so `browser_*` tools can drive it. Call again after every re-attach.
   */
  attachBrowser(windowId: Id, webContentsId: number): Promise<void>
  /** Answers a `desktop.appRequest` push. */
  respondAppRequest(response: AppResponse): Promise<void>
  /** Brings a window forward and focuses it; a minimized window is restored first ("Show" on a chat card, the taskbar). */
  raiseWindow(windowId: Id): Promise<void>
  /** The user typed or clicked in a window of the desktop: for the next 2 seconds a window the agent opens does not take the focus. */
  userActive(desktopId: Id): Promise<void>
  /**
   * The operator focused or typed in the chat pane of a window (`active`), or the pane was hidden (`!active`): while that
   * window has the focus, the pane's chat is the foreground chat (`docs/AGENT_PRESENCE.md`, rule 1).
   */
  notePaneFocus(windowId: Id, active: boolean): Promise<void>
  /** The operator is done with the show on screen (OK, Reply, Esc, any click or key): the next one waiting shows. */
  dismissShow(desktopId: Id, showId: string): Promise<void>
  /** **Show** on a request balloon or its Action Center line: the operator asked, so the target opens with the focus. */
  acceptShow(desktopId: Id, showId: string): Promise<void>
  /** **Show again** on a transcript row: the target opens at the spot with the note, without the cursor. */
  showAgain(desktopId: Id, sessionId: Id, target: ShowTarget, note: string): Promise<void>
  /** **Follow**: the operator watches this chat's work live (one at a time; another replaces it). `null` stops following. */
  follow(desktopId: Id, sessionId: Id | null, keep?: boolean): Promise<void>
  /** **Keep following**: the follow stays after the chat's turn ends. */
  setKeepFollowing(desktopId: Id, keep: boolean): Promise<void>
}

export interface AgentProcessDto {
  agentId: Id
  agentName: string
  desktopId: Id
  pid: number | null
  /** Memory of the program in bytes; null when it cannot be read. */
  memoryBytes: number | null
  /** Percent of one CPU core; null when it cannot be read. */
  cpuPercent: number | null
  sessionIds: Id[]
}

export interface DesktopEvents extends DesktopExtrasEvents {
  /** Full state of this OS window's desktop after any change. */
  'desktop.changed': DesktopState
}

// ---------------------------------------------------------------- app requests (main -> renderer app -> main)

/**
 * Some tools need the renderer: paint_read renders the canvas, wordpad_read
 * reads unsaved text. Main pushes `desktop.appRequest` to the owning window,
 * the app answers with `desktop.respondAppRequest`. Timeout 10 s in main.
 */
export interface AppRequest {
  requestId: string
  /** The desktop (OS window) the request is pushed to. */
  desktopId: Id
  windowId: Id
  method: string
  params: unknown
}
export type AppResponse = { requestId: string; ok: true; result: unknown } | { requestId: string; ok: false; error: string }

// ---------------------------------------------------------------- sticky notes, events, recycle bin

export type StickyColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'white'

export interface StickyNoteDto {
  id: Id
  desktopId: Id
  text: string
  color: StickyColor
  bounds: Bounds
  /** When set, the note mirrors that chat's plan (tasks) live and its text is generated. */
  planSessionId: Id | null
  author: OpenedBy
}

/** One raw protocol event (ACP JSON-RPC message or AG-UI event), kept in memory per desktop. */
export interface ProtocolEventDto {
  id: number
  at: IsoDate
  desktopId: Id
  sessionId: Id | null
  source: 'acp' | 'ag-ui' | 'mcp' | 'scheduler'
  direction: 'in' | 'out'
  level: EventLevel
  /** JSON-RPC method or AG-UI event type. */
  name: string
  /** Pretty JSON, truncated to 64 KB. */
  payload: string
}

export interface ProtocolEventQuery {
  desktopId: Id
  sessionId?: Id | null
  source?: ProtocolEventDto['source']
  level?: EventLevel
  text?: string
  afterId?: number
  limit?: number
}

/** A change the user reverted; can be restored (re-applies `revertedText`). */
export interface RecycledChangeDto {
  id: Id
  desktopId: Id
  sessionId: Id | null
  /** Where the file is (or was) on the desktop; `?:\...` when its drive has been ejected. */
  path: VPath
  /** The agent's version that the revert threw away (null when the agent deleted the file). */
  revertedText: string | null
  /** What revert wrote back (null when revert deleted an added file). */
  restoredText: string | null
  revertedAt: IsoDate
}

export interface DesktopExtrasApi {
  notes: {
    list(desktopId: Id): Promise<StickyNoteDto[]>
    add(desktopId: Id, text: string, color?: StickyColor): Promise<StickyNoteDto>
    update(id: Id, patch: Partial<Pick<StickyNoteDto, 'text' | 'color' | 'bounds' | 'planSessionId'>>): Promise<StickyNoteDto>
    remove(id: Id): Promise<void>
  }
  events: {
    query(query: ProtocolEventQuery): Promise<ProtocolEventDto[]>
    clear(desktopId: Id): Promise<void>
  }
  recycle: {
    list(desktopId: Id): Promise<RecycledChangeDto[]>
    restore(id: Id): Promise<void>
    remove(id: Id): Promise<void>
    empty(desktopId: Id): Promise<void>
  }
  snip: {
    /** Captures the desktop window (or a region of it, in CSS px) as a PNG data URL. */
    capture(desktopId: Id, region?: Bounds): Promise<string>
    /**
     * Saves a snip (a PNG data URL) as a picture on the desktop's C: drive, in Pictures\Snips, and returns where:
     * `path` on the desktop, `filePath` on this computer (what a chat attaches).
     */
    save(desktopId: Id, dataUrl: string): Promise<{ path: VPath; filePath: string }>
  }
}

export interface DesktopExtrasEvents {
  'desktop.appRequest': AppRequest
  'notes.changed': { desktopId: Id; notes: StickyNoteDto[] }
  'events.appended': ProtocolEventDto[]
  'recycle.changed': { desktopId: Id }
}
