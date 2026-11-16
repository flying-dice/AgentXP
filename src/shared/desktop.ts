/**
 * The desktop contract shared by main and renderer: desktops, app windows,
 * per-app view state, tool groups and the policy that maps open apps to the
 * tools the agent gets. See docs/DESKTOP_DESIGN.md.
 *
 * Pure types, constants and pure functions only.
 */
import type { A2uiSurfaceTarget } from './a2ui'
import type { Id, IsoDate } from './models'
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
  'event-viewer',
  'snipping-tool',
  'recycle-bin',
  'surface',
  'help',
  'code-review'
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
  'event-viewer',
  'snipping-tool',
  'recycle-bin',
  'help'
]

/** Windows that have no chat pane: Chat is the chat, Code Review has its reviewer panel, a surface is the agent's own UI. */
export const ASIDE_EXCLUDED_APPS: readonly AppKind[] = ['chat', 'code-review', 'surface']
export const supportsAside = (app: AppKind): boolean => !ASIDE_EXCLUDED_APPS.includes(app)

export type WindowState = 'normal' | 'minimized' | 'maximized'
export type OpenedBy = 'user' | 'agent'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** Per-app view state: what the window currently shows. Sent to the agent. */
export type AppView =
  | { app: 'chat'; sessionId: Id; title: string }
  /** `path` is a VPath; '' means "Computer" (the drives root, the initial view of a new Explorer). */
  | { app: 'explorer'; path: VPath | ''; selected: VPath[] }
  | { app: 'notepad'; path: VPath | null; dirty: boolean; caretLine: number }
  | {
      app: 'code'
      tabs: VPath[]
      activePath: VPath | null
      visibleLines: [number, number] | null
      selection: { startLine: number; endLine: number } | null
      selectedChangeId: Id | null
    }
  | { app: 'terminal'; terminalId: string | null; cwd: VPath; runningCommand: string | null; lastLines: string[] }
  | { app: 'browser'; url: string; title: string; loading: boolean }
  | { app: 'control-centre'; page: ControlCentrePage }
  | { app: 'agent-manager' }
  | { app: 'paint'; path: VPath | null; width: number; height: number; tool: PaintTool; color: string; dirty: boolean }
  | { app: 'wordpad'; path: VPath | null; mode: 'read' | 'edit'; dirty: boolean; visibleHeading: string | null }
  | { app: 'sticky-notes' }
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
  | { app: 'code-review'; root: VPath; baseRef: string; selectedPath: string | null; sessionId: Id }

export type PaintTool = 'pencil' | 'brush' | 'line' | 'rect' | 'ellipse' | 'fill' | 'text' | 'eraser' | 'picker'
export type EventLevel = 'info' | 'warning' | 'error'

export type ControlCentrePage = 'agents' | 'permissions' | 'appearance' | 'about'

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
  /** Enabled tool groups, derived from the open windows with `enabledToolGroups`. */
  tools: ToolGroup[]
  paused: boolean
  /** "Ask before every action": the agent must ask before every action, whatever the permissions say. */
  userInControl: boolean
  /** The Control Center permissions, so the top bar can show what is on, asks or off. Absent in older fixtures. */
  policy?: ToolPolicyDto
  /** The desktop's sticky notes (the agent sees them in `desktop_state`). */
  notes: StickyNoteDto[]
  /** Every A2UI surface of the desktop's chats and where it is shown. */
  surfaces: SurfaceStateDto[]
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
  'fs.read', // ACP fs/read_text_file, fs_list, fs_find
  'fs.write', // ACP fs/write_text_file
  'notepad', // notepad_open, notepad_read
  'code', // code_open, code_reveal, code_show_diff
  'terminal', // ACP terminal/*, terminal_run, terminal_read
  'browser', // browser_*
  'paint', // paint_draw, paint_read, paint_clear, paint_resize
  'wordpad', // wordpad_open, wordpad_read, wordpad_write
  'notes', // notes_list, notes_add, notes_update, notes_remove
  'events', // events_query
  'snip', // screen_capture
  'recycle', // recycle_list, recycle_restore
  'review' // review_list_changes, review_read_diff, review_add_comment, review_submit (only for the session that owns a Code Review window)
] as const
export type ToolGroup = (typeof TOOL_GROUPS)[number]

/** Which app kinds provide each tool group. `shell` needs no app. */
export const TOOL_GROUP_PROVIDERS: Record<ToolGroup, readonly AppKind[]> = {
  shell: [],
  'fs.read': ['explorer', 'code', 'code-review'],
  'fs.write': ['notepad', 'code'],
  notepad: ['notepad'],
  code: ['code'],
  terminal: ['terminal'],
  browser: ['browser'],
  paint: ['paint'],
  wordpad: ['wordpad'],
  notes: ['sticky-notes'],
  events: ['event-viewer'],
  snip: ['snipping-tool'],
  recycle: ['recycle-bin'],
  review: ['code-review']
}

/** The app suggested to the agent when a group is missing. */
export const TOOL_GROUP_APP: Record<Exclude<ToolGroup, 'shell'>, AppKind> = {
  'fs.read': 'explorer',
  'fs.write': 'code',
  notepad: 'notepad',
  code: 'code',
  terminal: 'terminal',
  browser: 'browser',
  paint: 'paint',
  wordpad: 'wordpad',
  notes: 'sticky-notes',
  events: 'event-viewer',
  snip: 'snipping-tool',
  recycle: 'recycle-bin',
  review: 'code-review'
}

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
  'event-viewer': 'Event Viewer',
  'snipping-tool': 'Snipping Tool',
  'recycle-bin': 'Recycle Bin',
  surface: 'Agent window',
  help: 'Help and Support',
  'code-review': 'Code Review'
}

/** AppToolPolicy: the tool groups enabled by a set of open windows (minimised windows count as open). */
export function enabledToolGroups(openApps: Iterable<AppKind>): ToolGroup[] {
  const open = new Set(openApps)
  return TOOL_GROUPS.filter((g) => g === 'shell' || TOOL_GROUP_PROVIDERS[g].some((k) => open.has(k)))
}

/** The message an agent gets when it uses a tool whose app is closed. */
export function closedAppMessage(group: Exclude<ToolGroup, 'shell'>): string {
  // The agent cannot open a review window itself: the user starts a review (Start menu, Code app "Review changes").
  if (group === 'review') return 'There is no Code Review window on this desktop. The user opens one (Start menu, Code Review) and the review tools only work in the review session that window belongs to.'
  const app = TOOL_GROUP_APP[group]
  return `The ${APP_DISPLAY_NAMES[app]} app is closed on this desktop. Call desktop_open_app with app "${app}" to open it.`
}

// ---------------------------------------------------------------- permission policy

export type PolicyDecision = 'allow' | 'ask' | 'deny'

/** Control Center permission policy. `openApps` governs desktop_open_app. */
export interface ToolPolicyDto {
  groups: Record<Exclude<ToolGroup, 'shell'>, PolicyDecision>
  openApps: PolicyDecision
}

export const DEFAULT_TOOL_POLICY: ToolPolicyDto = {
  groups: { 'fs.read': 'allow', 'fs.write': 'ask', notepad: 'allow', code: 'allow', terminal: 'ask', browser: 'allow', paint: 'allow', wordpad: 'ask', notes: 'allow', events: 'allow', snip: 'allow', recycle: 'ask', review: 'allow' },
  openApps: 'allow'
}

// ---------------------------------------------------------------- AG-UI

/** `RunAgentInput.context[].description` of the desktop context entry. */
export const DESKTOP_CONTEXT_DESCRIPTION = 'agent7.desktop'
/** URI of the ACP resource block that carries the desktop state into a prompt. */
export const DESKTOP_RESOURCE_URI = 'agent7://desktop/state'

// ---------------------------------------------------------------- IPC

export interface OpenWindowInput {
  desktopId: Id
  app: AppKind
  /** Initial view hints: a VPath for explorer/notepad/code/wordpad/paint, a url for browser, a session for chat, a session and surface id for surface. */
  path?: VPath
  url?: string
  sessionId?: Id
  /** The A2UI surface of a `surface` window (with `sessionId`: the chat that owns it). */
  surfaceId?: string
  /** The topic of a `help` window (a file name in `manuals` without `.md`). */
  topic?: string
  /** The base ref of a `code-review` window (default `HEAD`). */
  baseRef?: string
  /** Browser: open another window even when one is open (File > New window). Read by the desktop shell; main ignores it. */
  newWindow?: boolean
}

/**
 * "Ask chat about this": what an app hands to the desktop when the user picks Explain this, Ask chat... or Send
 * selection to chat from a context menu. `DesktopHost.askChat` turns it into a chat prompt; a chat side panel can
 * take the same request later, so the apps never change.
 */
export interface AskChatRequest {
  /** The app the request comes from. */
  app: AppKind
  /** The window it comes from (its drive decides where a new chat works). */
  windowId: Id
  /**
   * explain: "Explain this"; ask: "Ask chat..." (the user adds the question); send: "Send selection to chat"; window: "Open in Chat
   * window" (like send, but in a new full chat instead of the window's chat pane).
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
  setUserInControl(desktopId: Id, on: boolean): Promise<void>
  /** Starts a chat (ACP session) on the desktop and opens its Chat window. `cwd` (a VPath on a plugged-in drive or C:) defaults to `AGENT_HOME`. */
  newChat(desktopId: Id, agentId?: Id, cwd?: VPath): Promise<AppWindowState>
  /**
   * Starts a code review of the folder `root` (a VPath on a plugged-in drive or C:) against `baseRef` (default `HEAD`):
   * creates the review session (role `review`, `cwd` = `root`), opens its Code Review window and asks the agent for a review.
   */
  openReview(desktopId: Id, root: VPath, baseRef?: string, agentId?: Id): Promise<AppWindowState>
  /**
   * The chat pane of an app window (not Chat, Code Review or a surface): returns the id of the window's `aside` session,
   * creating it on the first call (cwd = the window's drive, else the agent's home). The session lives and dies with the
   * window: closing the window deletes it.
   */
  openAside(desktopId: Id, windowId: Id, agentId?: Id): Promise<Id>
  /** "New conversation": deletes the window's aside session (its transcript goes too); the next `openAside` starts a fresh one. */
  closeAside(windowId: Id): Promise<void>
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
  source: 'acp' | 'ag-ui' | 'mcp'
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
