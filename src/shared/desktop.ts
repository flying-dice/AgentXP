/**
 * The desktop contract shared by main and renderer: desktops, app windows,
 * per-app view state, tool groups and the policy that maps open apps to the
 * tools the agent gets. See docs/DESKTOP_DESIGN.md.
 *
 * Pure types, constants and pure functions only.
 */
import type { Id, IsoDate } from './models'
import type { DriveDto, VPath } from './vfs'

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
  'recycle-bin'
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
  'recycle-bin'
]

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
  /** The agent's home directory (`AGENT_HOME`, on C:). */
  home: VPath
  focusedWindowId: Id | null
  /** Back to front. */
  windows: AppWindowState[]
  /** Enabled tool groups, derived from the open windows with `enabledToolGroups`. */
  tools: ToolGroup[]
  paused: boolean
  userInControl: boolean
  /** The desktop's sticky notes (the agent sees them in `desktop_state`). */
  notes: StickyNoteDto[]
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
  'recycle' // recycle_list, recycle_restore
] as const
export type ToolGroup = (typeof TOOL_GROUPS)[number]

/** Which app kinds provide each tool group. `shell` needs no app. */
export const TOOL_GROUP_PROVIDERS: Record<ToolGroup, readonly AppKind[]> = {
  shell: [],
  'fs.read': ['explorer', 'code'],
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
  recycle: ['recycle-bin']
}

/** The app suggested to the agent when a group is missing. */
export const TOOL_GROUP_APP: Record<Exclude<ToolGroup, 'shell'>, AgentOpenableApp> = {
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
  recycle: 'recycle-bin'
}

export const APP_DISPLAY_NAMES: Record<AppKind, string> = {
  chat: 'Chat',
  explorer: 'Explorer',
  notepad: 'Notepad',
  code: 'Code',
  terminal: 'Terminal',
  browser: 'Browser',
  'control-centre': 'Control Centre',
  'agent-manager': 'Task Manager',
  paint: 'Agent Paint',
  wordpad: 'WordPad',
  'sticky-notes': 'Sticky Notes',
  'event-viewer': 'Event Viewer',
  'snipping-tool': 'Snipping Tool',
  'recycle-bin': 'Recycle Bin'
}

/** AppToolPolicy: the tool groups enabled by a set of open windows (minimised windows count as open). */
export function enabledToolGroups(openApps: Iterable<AppKind>): ToolGroup[] {
  const open = new Set(openApps)
  return TOOL_GROUPS.filter((g) => g === 'shell' || TOOL_GROUP_PROVIDERS[g].some((k) => open.has(k)))
}

/** The message an agent gets when it uses a tool whose app is closed. */
export function closedAppMessage(group: Exclude<ToolGroup, 'shell'>): string {
  const app = TOOL_GROUP_APP[group]
  return `The ${APP_DISPLAY_NAMES[app]} app is closed on this desktop. Call desktop_open_app with app "${app}" to open it.`
}

// ---------------------------------------------------------------- permission policy

export type PolicyDecision = 'allow' | 'ask' | 'deny'

/** Control Centre permission policy. `openApps` governs desktop_open_app. */
export interface ToolPolicyDto {
  groups: Record<Exclude<ToolGroup, 'shell'>, PolicyDecision>
  openApps: PolicyDecision
}

export const DEFAULT_TOOL_POLICY: ToolPolicyDto = {
  groups: { 'fs.read': 'allow', 'fs.write': 'ask', notepad: 'allow', code: 'allow', terminal: 'ask', browser: 'allow', paint: 'allow', wordpad: 'ask', notes: 'allow', events: 'allow', snip: 'allow', recycle: 'ask' },
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
  /** Initial view hints: a VPath for explorer/notepad/code/wordpad/paint, a url for browser, a session for chat. */
  path?: VPath
  url?: string
  sessionId?: Id
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
  policy(): Promise<ToolPolicyDto>
  setPolicy(policy: ToolPolicyDto): Promise<void>
  /**
   * Tells main which guest `webContents` (`webview.getWebContentsId()`) renders the Browser window
   * `windowId`, so `browser_*` tools can drive it. Call again after every re-attach.
   */
  attachBrowser(windowId: Id, webContentsId: number): Promise<void>
  /** Answers a `desktop.appRequest` push. */
  respondAppRequest(response: AppResponse): Promise<void>
}

export interface AgentProcessDto {
  agentId: Id
  agentName: string
  desktopId: Id
  pid: number | null
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
  }
}

export interface DesktopExtrasEvents {
  'desktop.appRequest': AppRequest
  'notes.changed': { desktopId: Id; notes: StickyNoteDto[] }
  'events.appended': ProtocolEventDto[]
  'recycle.changed': { desktopId: Id }
}
