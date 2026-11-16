/**
 * The desktop contract shared by main and renderer: desktops, app windows,
 * per-app view state, tool groups and the policy that maps open apps to the
 * tools the agent gets. See docs/DESKTOP_DESIGN.md.
 *
 * Pure types, constants and pure functions only.
 */
import type { Id, IsoDate } from './models'

export const APP_KINDS = [
  'chat',
  'explorer',
  'notepad',
  'code',
  'terminal',
  'browser',
  'control-centre',
  'agent-manager'
] as const
export type AppKind = (typeof APP_KINDS)[number]

/** Apps the agent may open or close with desktop_open_app / desktop_close_app. */
export const AGENT_OPENABLE_APPS = ['explorer', 'notepad', 'code', 'terminal', 'browser'] as const satisfies readonly AppKind[]
export type AgentOpenableApp = (typeof AGENT_OPENABLE_APPS)[number]

/** Apps that can have at most one window per desktop. */
export const SINGLETON_APPS: readonly AppKind[] = ['code', 'control-centre', 'agent-manager']

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
  | { app: 'explorer'; path: string; selected: string[] }
  | { app: 'notepad'; path: string | null; dirty: boolean; caretLine: number }
  | {
      app: 'code'
      tabs: string[]
      activePath: string | null
      visibleLines: [number, number] | null
      selection: { startLine: number; endLine: number } | null
      selectedChangeId: Id | null
    }
  | { app: 'terminal'; terminalId: string | null; cwd: string; runningCommand: string | null; lastLines: string[] }
  | { app: 'browser'; url: string; title: string; loading: boolean }
  | { app: 'control-centre'; page: ControlCentrePage }
  | { app: 'agent-manager' }

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

export interface DesktopDto {
  id: Id
  folderId: Id
  agentId: Id | null
  title: string
  isOpen: boolean
  createdAt: IsoDate
}

/** The whole live desktop: AG-UI `state.desktop` and the agent's `desktop_state`. */
export interface DesktopState {
  desktopId: Id
  title: string
  folder: { id: Id; path: string; name: string }
  focusedWindowId: Id | null
  /** Back to front. */
  windows: AppWindowState[]
  /** Enabled tool groups, derived from the open windows with `enabledToolGroups`. */
  tools: ToolGroup[]
  paused: boolean
  userInControl: boolean
}

// ---------------------------------------------------------------- tools

export const TOOL_GROUPS = [
  'shell', // desktop_* and a2ui_* (always on)
  'fs.read', // ACP fs/read_text_file, fs_list, fs_find
  'fs.write', // ACP fs/write_text_file
  'notepad', // notepad_open, notepad_read
  'code', // code_open, code_reveal, code_show_diff
  'terminal', // ACP terminal/*, terminal_run, terminal_read
  'browser' // browser_*
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
  browser: ['browser']
}

/** The app suggested to the agent when a group is missing. */
export const TOOL_GROUP_APP: Record<Exclude<ToolGroup, 'shell'>, AgentOpenableApp> = {
  'fs.read': 'explorer',
  'fs.write': 'code',
  notepad: 'notepad',
  code: 'code',
  terminal: 'terminal',
  browser: 'browser'
}

export const APP_DISPLAY_NAMES: Record<AppKind, string> = {
  chat: 'Chat',
  explorer: 'Explorer',
  notepad: 'Notepad',
  code: 'Code',
  terminal: 'Terminal',
  browser: 'Browser',
  'control-centre': 'Control Centre',
  'agent-manager': 'Agent Manager'
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
  groups: { 'fs.read': 'allow', 'fs.write': 'ask', notepad: 'allow', code: 'allow', terminal: 'ask', browser: 'allow' },
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
  /** Initial view hints: a path for explorer/notepad/code, a url for browser, a session for chat. */
  path?: string
  url?: string
  sessionId?: Id
}

export interface DesktopApi {
  list(): Promise<DesktopDto[]>
  /** The desktop shown by this OS window (from the `?desktop=` query), or null on first launch. */
  current(): Promise<DesktopState | null>
  /** Shows the folder picker, creates a desktop and opens it in a new OS window. */
  create(folderId?: Id): Promise<DesktopDto | null>
  /** Opens an existing desktop in its OS window (focuses it when already open). */
  open(id: Id): Promise<void>
  rename(id: Id, title: string): Promise<void>
  remove(id: Id): Promise<void>
  openWindow(input: OpenWindowInput): Promise<AppWindowState>
  closeWindow(windowId: Id): Promise<void>
  focusWindow(windowId: Id): Promise<void>
  setBounds(windowId: Id, bounds: Bounds): Promise<void>
  setWindowState(windowId: Id, state: WindowState): Promise<void>
  /** Debounced by the caller. Transient: not persisted except path/url. */
  updateView(windowId: Id, view: AppView): Promise<void>
  setPaused(desktopId: Id, paused: boolean): Promise<void>
  setUserInControl(desktopId: Id, on: boolean): Promise<void>
  /** Starts a chat (ACP session) on the desktop and opens its Chat window. */
  newChat(desktopId: Id, agentId?: Id): Promise<AppWindowState>
  policy(): Promise<ToolPolicyDto>
  setPolicy(policy: ToolPolicyDto): Promise<void>
}

export interface AgentProcessDto {
  agentId: Id
  agentName: string
  desktopId: Id
  pid: number | null
  sessionIds: Id[]
}

export interface DesktopEvents {
  /** Full state of this OS window's desktop after any change. */
  'desktop.changed': DesktopState
}
