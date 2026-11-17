/**
 * Pure helpers shared by main (`DesktopService`) and the renderer's fake desktop:
 * default window bounds, the initial view of a new window and window titles.
 */
import { AGENT_HOME, parseVPath, vpathName, type VPath } from './vfs'
import { APP_DISPLAY_NAMES, APP_KINDS, type AppKind, type AppView, type Bounds, type OpenWindowInput } from './desktop'

/** Window title of a surface that has no `theme.title`. */
export const SURFACE_FALLBACK_TITLE = 'Agent window'

export const DEFAULT_BOUNDS: Record<AppKind, Bounds> = {
  chat: { x: 40, y: 40, width: 680, height: 560 },
  explorer: { x: 120, y: 80, width: 620, height: 420 },
  notepad: { x: 200, y: 120, width: 520, height: 380 },
  code: { x: 80, y: 60, width: 820, height: 640 },
  terminal: { x: 160, y: 300, width: 640, height: 300 },
  browser: { x: 100, y: 50, width: 860, height: 600 },
  'control-centre': { x: 180, y: 90, width: 760, height: 540 },
  'agent-manager': { x: 220, y: 110, width: 820, height: 440 },
  paint: { x: 140, y: 70, width: 860, height: 640 },
  wordpad: { x: 170, y: 80, width: 700, height: 520 },
  'sticky-notes': { x: 600, y: 60, width: 360, height: 420 },
  kanban: { x: 120, y: 50, width: 900, height: 520 },
  diagrams: { x: 70, y: 30, width: 1080, height: 700 },
  'event-viewer': { x: 130, y: 90, width: 980, height: 560 },
  'snipping-tool': { x: 300, y: 140, width: 420, height: 220 },
  'recycle-bin': { x: 240, y: 120, width: 680, height: 420 },
  surface: { x: 260, y: 100, width: 480, height: 360 },
  help: { x: 150, y: 70, width: 800, height: 560 },
  'code-review': { x: 50, y: 30, width: 1120, height: 650 },
  teams: { x: 190, y: 90, width: 820, height: 560 },
  'team-chat': { x: 60, y: 50, width: 760, height: 580 },
  'task-scheduler': { x: 110, y: 70, width: 1000, height: 600 }
}

/**
 * Smallest size of a window: 480 x 320, and more for the apps whose controls do not fit in that (the resize audit measured each
 * app at its minimum, with and without the chat pane, until nothing clipped or overlapped).
 */
export const MIN_WINDOW_SIZES: Partial<Record<AppKind, { width: number; height: number }>> = {
  'control-centre': { width: 640, height: 420 },
  'task-scheduler': { width: 760, height: 520 },
  diagrams: { width: 640, height: 440 },
  // Chat tiles down to 360 px beside another window, but needs 420 px of height for its composer and Send button.
  chat: { width: 360, height: 420 },
  'code-review': { width: 720, height: 440 },
  paint: { width: 520, height: 440 },
  // An agent-drawn window takes the size its theme asks for, down to a short dialog.
  surface: { width: 280, height: 160 }
}
export const DEFAULT_MIN_WINDOW_SIZE = { width: 480, height: 320 } as const
export const minWindowSize = (app: AppKind): { width: number; height: number } => MIN_WINDOW_SIZES[app] ?? DEFAULT_MIN_WINDOW_SIZE
/**
 * The size no window of the app is ever laid out below, whoever set it (a placement, a stored size, the agent): the app's own
 * minimum when it has one, else the smallest tile (360 x 220, the size a plain tool is squeezed to beside a chat).
 */
export const hardMinSize = (app: AppKind): { width: number; height: number } => MIN_WINDOW_SIZES[app] ?? MIN_TILE

/** Bounds no smaller than `hardMinSize` (a stored, requested or agent-set size never makes a window that cannot lay out its content). */
export const atLeastMinSize = <B extends { width: number; height: number }>(app: AppKind, b: B): B => {
  const min = hardMinSize(app)
  return b.width >= min.width && b.height >= min.height ? b : { ...b, width: Math.max(min.width, b.width), height: Math.max(min.height, b.height) }
}

/**
 * Height of the top bar of the desktop until the renderer has measured it (UX-88). The bar is about 52 px with the
 * chips row and 68 px with the status line, so a first paint uses the larger one.
 */
export const TOP_BAR_HEIGHT = 68
/** A new window starts this far below the bar. */
const BAR_GAP = 4
/** The lowest `y` a window is placed at for a bar of `barHeight` pixels (the fallback height until it is measured). */
export const windowMinY = (barHeight: number = TOP_BAR_HEIGHT): number => Math.round(barHeight) + BAR_GAP
/** The lowest `y` a new window is placed at before the bar is measured. */
export const WINDOW_MIN_Y = windowMinY()

/**
 * Windows that show the same title (two Explorer windows on Computer) get " (2)", " (3)" in the order they were opened,
 * so the window frames and taskbar buttons of one desktop can be told apart. The first keeps its title.
 */
export function numberDuplicateTitles<T extends { id: number; title: string }>(windows: readonly T[]): T[] {
  const seen = new Map<string, number>()
  const counts = new Map<number, number>()
  for (const w of [...windows].sort((a, b) => a.id - b.id)) {
    const n = (seen.get(w.title) ?? 0) + 1
    seen.set(w.title, n)
    counts.set(w.id, n)
  }
  return windows.map((w) => ((counts.get(w.id) ?? 1) > 1 ? { ...w, title: `${w.title} (${counts.get(w.id)})` } : w))
}

/** Each new window starts this many pixels right of and below the previous one. */
export const CASCADE_STEP = 32

/** Default bounds of a new window, cascaded by the number of windows already open. */
export function cascadedBounds(app: AppKind, openCount: number, size?: { width: number; height: number }): Bounds {
  const offset = (openCount % 6) * CASCADE_STEP
  const b = DEFAULT_BOUNDS[app]
  return atLeastMinSize(app, { ...b, ...(size ?? {}), x: b.x + offset, y: b.y + offset })
}

/**
 * The desktop area new windows are placed in. Main does not know the real viewport; this is the
 * default AgentXP window (1280x800) minus the top bar and the taskbar.
 */
export const DESKTOP_AREA = { width: 1280, height: 730 } as const

/** Gap kept between a new window and the window it avoids. */
const PLACEMENT_GAP = 8
/** Smallest size a new window is squeezed to when it is tiled into the space beside another window. */
const MIN_TILE = { width: 360, height: 220 }
/**
 * Windows that are never squeezed narrower than this when tiled beside another window: Control Center keeps its list, header and
 * buttons apart from 640 px (UX-115), Event Viewer its Level and Date and Time columns whole from 720 px (UX-121). Without that
 * much room they take their default size and cascade over the other window instead.
 */
const TILE_MIN_WIDTH: Partial<Record<AppKind, number>> = { 'control-centre': 640, 'event-viewer': 720 }
/** A tiled window is never squeezed below its own smallest size either (a 760 px Task Scheduler was squeezed to 360 px beside a chat). */
const tileMinWidth = (app: AppKind): number => Math.max(TILE_MIN_WIDTH[app] ?? MIN_TILE.width, hardMinSize(app).width)
const tileMinHeight = (app: AppKind): number => Math.max(MIN_TILE.height, hardMinSize(app).height)

const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** Moves (and, when it is larger than the area, shrinks) `b` so it lies inside `area`. */
function within(b: Bounds, area: { width: number; height: number }, minY: number): Bounds {
  const width = Math.min(b.width, area.width)
  const height = Math.min(b.height, Math.max(1, area.height - minY))
  return { x: clamp(b.x, 0, area.width - width), y: clamp(b.y, minY, Math.max(minY, area.height - height)), width, height }
}

/**
 * Bounds of a new window. Without a window to avoid this is the cascade (`cascadedBounds`). With one
 * (the focused chat: the user is typing in it) the window is tiled where it does not cover it, in this order:
 * to the right, below, to the left, above at full size, then squeezed into the room to the right, below or to the left.
 * When there is no room at all it falls back to the cascade (overlap cannot be avoided). Always inside `area`.
 */
export function placeWindow(
  app: AppKind,
  openCount: number,
  avoid: Bounds | null,
  area: { width: number; height: number } = DESKTOP_AREA,
  size?: { width: number; height: number },
  minY: number = WINDOW_MIN_Y
): Bounds {
  const base = within(cascadedBounds(app, openCount, size), area, minY)
  if (!avoid || !overlaps(base, avoid)) return base
  const { width, height } = base
  const top = clamp(avoid.y, minY, Math.max(minY, area.height - height))
  const left = clamp(avoid.x, 0, area.width - width)
  const rightX = avoid.x + avoid.width + PLACEMENT_GAP
  const belowY = avoid.y + avoid.height + PLACEMENT_GAP
  const exact: Bounds[] = [
    { x: rightX, y: top, width, height },
    { x: left, y: belowY, width, height },
    { x: avoid.x - PLACEMENT_GAP - width, y: top, width, height },
    { x: left, y: avoid.y - PLACEMENT_GAP - height, width, height }
  ]
  const fits = exact.find((b) => b.x >= 0 && b.y >= minY && b.x + b.width <= area.width && b.y + b.height <= area.height)
  if (fits) return fits
  const roomRight = area.width - rightX
  if (roomRight >= tileMinWidth(app)) return { x: rightX, y: top, width: roomRight, height }
  const roomBelow = area.height - belowY
  if (roomBelow >= tileMinHeight(app)) return { x: left, y: belowY, width, height: roomBelow }
  // The window sits at the right edge (a chat does): squeeze into the room to its left (UX-181).
  const roomLeft = avoid.x - PLACEMENT_GAP
  if (roomLeft >= tileMinWidth(app)) return { x: 0, y: top, width: roomLeft, height }
  return base
}

/** A window opened from another: how far right and down it starts from the window that has the focus. */
export const PARENT_OFFSET = 28

/** Tools that open beside the window that asked for them (on the side with more free width) instead of on top of it. */
const SIDE_APPS: ReadonlySet<AppKind> = new Set<AppKind>(['help', 'event-viewer', 'snipping-tool', 'agent-manager'])

/** The Review window opens this wide at least, and this share of the work area wide when that is more (UX-129). */
export const REVIEW_MIN_WIDTH = 720
const REVIEW_WIDTH_SHARE = 0.7

/**
 * The Review window next to a window that is not a chat: wide enough for whole code lines (70% of the work area, at least
 * 720 px), against the right edge so the window it came from stays visible on the left.
 */
function placeReview(base: Bounds, parent: Bounds, area: { width: number; height: number }, minY: number): Bounds {
  const width = Math.min(area.width, Math.max(REVIEW_MIN_WIDTH, Math.round(area.width * REVIEW_WIDTH_SHARE)))
  return within({ ...base, x: area.width - width, y: Math.max(parent.y, minY), width }, area, minY)
}

/** The window that has the focus when a new one opens. */
export interface PlacementParent {
  app: AppKind
  bounds: Bounds
}

/**
 * Bounds of a new window (UX-88). Below the top bar always (`minY`). Next to the focused window:
 * - the focused chat is never covered: the window is tiled beside it (`placeWindow`);
 * - Help, Event Viewer and other tools that go beside what asked for them take the side of the desktop with more free width
 *   (squeezed to fit, else they cascade);
 * - everything else cascades from the focused window: 28 px right and down, so its title bar and buttons stay visible.
 * With no focused window this is the plain cascade.
 */
export function placeNewWindow(
  app: AppKind,
  openCount: number,
  parent: PlacementParent | null,
  area: { width: number; height: number } = DESKTOP_AREA,
  size?: { width: number; height: number },
  minY: number = WINDOW_MIN_Y
): Bounds {
  const placed = placeBesideParent(app, openCount, parent, area, size, minY)
  const cleared = clearIconColumn(placed, area)
  // Moving off the icons must not put the window back over the window it was tiled beside.
  return parent && overlaps(cleared, parent.bounds) && !overlaps(placed, parent.bounds) ? placed : cleared
}

function placeBesideParent(
  app: AppKind,
  openCount: number,
  parent: PlacementParent | null,
  area: { width: number; height: number },
  size: { width: number; height: number } | undefined,
  minY: number
): Bounds {
  if (!parent) return placeWindow(app, openCount, null, area, size, minY)
  if (parent.app === 'chat') return placeWindow(app, openCount, parent.bounds, area, size, minY)
  const base = within(cascadedBounds(app, openCount, size), area, minY)
  const p = parent.bounds
  if (app === 'code-review') return placeReview(base, p, area, minY)
  if (SIDE_APPS.has(app)) {
    const left = p.x
    const right = area.width - (p.x + p.width)
    const onRight = right >= left
    const room = (onRight ? right : left) - PLACEMENT_GAP
    if (room >= tileMinWidth(app)) {
      const width = Math.min(base.width, room)
      const x = onRight ? p.x + p.width + PLACEMENT_GAP : p.x - PLACEMENT_GAP - width
      return within({ ...base, x, y: Math.max(p.y, minY), width }, area, minY)
    }
  }
  const x = p.x + PARENT_OFFSET
  const y = p.y + PARENT_OFFSET
  const fits = x + base.width <= area.width && y + base.height <= area.height
  if (fits) return { ...base, x, y: Math.max(y, minY) }
  // No room to cascade: keep the title bar of the focused window free (tile beside it when the default spot would cover it).
  const titleStrip: Bounds = { x: p.x, y: p.y, width: p.width, height: PARENT_OFFSET }
  return overlaps(base, titleStrip) ? placeWindow(app, openCount, p, area, size, minY) : base
}

/** The desktop icons sit in the left 100 px of the work area; a new window starts to the right of them (UX-166). */
export const ICON_COLUMN_WIDTH = 100

/** Moves a window that covers the icon column to the right of it, as far as the work area allows (it keeps its size). */
export function clearIconColumn(b: Bounds, area: { width: number; height: number }): Bounds {
  if (b.x >= ICON_COLUMN_WIDTH) return b
  return { ...b, x: Math.max(b.x, Math.min(ICON_COLUMN_WIDTH, area.width - b.width)) }
}

/** Smallest share of a Browser that a chat opened from it may cover (UX-120): none beyond a sliver. */
export const BROWSER_OVERLAP_LIMIT = 0.1

/**
 * A chat started from a Browser task opens beside the Browser, in the half of the work area the Browser does not use,
 * so the user can watch the page while the agent works (UX-120). The Browser keeps its side and is narrowed to its own
 * half when it is wider than that. `browser` is null when it already leaves enough room (it stays as it is).
 */
export function placeChatBesideBrowser(
  browser: Bounds,
  area: { width: number; height: number } = DESKTOP_AREA,
  minY: number = WINDOW_MIN_Y
): { chat: Bounds; browser: Bounds | null } {
  const half = Math.floor((area.width - PLACEMENT_GAP) / 2)
  const browserOnLeft = browser.x + browser.width / 2 <= area.width / 2
  const chatX = browserOnLeft ? area.width - half : 0
  const chat: Bounds = { x: chatX, y: Math.max(browser.y, minY), width: half, height: Math.min(DEFAULT_BOUNDS.chat.height, Math.max(1, area.height - Math.max(browser.y, minY))) }
  const covered = Math.max(0, Math.min(browser.x + browser.width, chat.x + chat.width) - Math.max(browser.x, chat.x)) / browser.width
  if (covered <= BROWSER_OVERLAP_LIMIT) return { chat, browser: null }
  const narrowed: Bounds = browserOnLeft ? { ...browser, x: 0, width: half } : { ...browser, x: area.width - half, width: half }
  return { chat, browser: narrowed }
}

export function initialView(input: Pick<OpenWindowInput, 'app' | 'path' | 'url' | 'sessionId' | 'surfaceId' | 'topic' | 'baseRef' | 'selectedPath' | 'roomId'>, title = 'Chat'): AppView {
  switch (input.app) {
    case 'chat':
      return { app: 'chat', sessionId: input.sessionId ?? 0, title }
    case 'explorer':
      // '' is "Computer" (the drives root).
      return { app: 'explorer', path: input.path ?? '', selected: [] }
    case 'notepad':
      return { app: 'notepad', path: input.path ?? null, dirty: false, caretLine: 1 }
    case 'code':
      return {
        app: 'code',
        tabs: input.path ? [input.path] : [],
        activePath: input.path ?? null,
        visibleLines: null,
        selection: null,
        selectedChangeId: null
      }
    case 'terminal':
      return { app: 'terminal', terminalId: null, cwd: AGENT_HOME, runningCommand: null, lastLines: [] }
    case 'browser':
      return { app: 'browser', url: input.url ?? 'about:blank', title: '', loading: false }
    case 'control-centre':
      return { app: 'control-centre', page: 'agents' }
    case 'agent-manager':
      return { app: 'agent-manager' }
    case 'paint':
      return { app: 'paint', path: input.path ?? null, width: 800, height: 600, tool: 'pencil', color: '#000000', dirty: false }
    case 'wordpad':
      return { app: 'wordpad', path: input.path ?? null, mode: 'read', dirty: false, visibleHeading: null }
    case 'sticky-notes':
      return { app: 'sticky-notes' }
    case 'kanban':
      return { app: 'kanban', boardId: null }
    case 'diagrams':
      return { app: 'diagrams', path: input.path ?? null, title: 'Drawing1', dirty: false, page: 0, pages: ['Page-1'], shapeCount: 0, connectorCount: 0, selection: [], outline: { shapes: [], connectors: [], more: 0 } }
    case 'event-viewer':
      return { app: 'event-viewer', sessionId: input.sessionId ?? null, level: 'all', selectedEventId: null }
    case 'snipping-tool':
      return { app: 'snipping-tool', lastSnipId: null }
    case 'recycle-bin':
      return { app: 'recycle-bin', selectedId: null }
    case 'surface':
      return { app: 'surface', surfaceId: input.surfaceId ?? '', sessionId: input.sessionId ?? 0, title: SURFACE_FALLBACK_TITLE }
    case 'help':
      return { app: 'help', topic: input.topic ?? 'index' }
    case 'teams':
      return { app: 'teams', tab: 'teams', selectedId: null }
    case 'team-chat':
      return { app: 'team-chat', roomId: input.roomId ?? 0, title }
    case 'task-scheduler':
      return { app: 'task-scheduler', selectedTaskId: null, tab: 'general' }
    case 'code-review':
      return { app: 'code-review', root: input.path ?? AGENT_HOME, baseRef: input.baseRef ?? 'HEAD', selectedPath: input.selectedPath ?? null, sessionId: input.sessionId ?? 0 }
  }
}

/** The program name of every Help window (UX-44): the same whatever topic it shows. */
export const HELP_PROGRAM_NAME = 'AgentXP Help and Support'

/** "AgentXP Help and Support: Using Notepad" for the topic of an app, "AgentXP Help and Support" for the home, desktop, launcher and Help topics. */
export function helpWindowTitle(topic: string): string {
  const base = topic.split('#')[0] // "browser#troubleshooting": the title comes from the topic
  const kind = (APP_KINDS as readonly string[]).includes(base) ? (base as AppKind) : null
  return kind && kind !== 'help' ? `${HELP_PROGRAM_NAME}: Using ${APP_DISPLAY_NAMES[kind]}` : HELP_PROGRAM_NAME
}

/** "Review - review-notes": the Code Review window is named after the project, like the chats of that project. */
export const reviewWindowTitle = (projectName: string): string => `Review - ${projectName}`

/** The title of the window of an agent's form: the same name as its chat row (UX-135). */
export const surfaceWindowTitle = (title: string): string => title

/** The window the Chats icon opens (UX-180): it carries the icon's name and the name of the program. */
export const CHATS_WINDOW_TITLE = 'Chats - Task Manager'

/**
 * The title of a window. `projectName` is the name of the project a Code Review window shows (the label of its drive,
 * which only the desktop knows); without it the folder name stands in.
 */
export function windowTitle(view: AppView, projectName?: string): string {
  switch (view.app) {
    case 'chat':
      return view.title
    case 'surface':
      return surfaceWindowTitle(view.title)
    case 'team-chat':
      return view.title
    case 'explorer':
      return view.path ? (view.path.length <= 3 ? view.path : vpathName(view.path)) : 'Computer'
    case 'notepad':
      return `${view.path ? vpathName(view.path) : 'Untitled'} - Notepad`
    case 'code':
      return view.activePath ? `${vpathName(view.activePath)} - Code` : 'Code'
    case 'browser':
      return view.title ? `${view.title} - Browser` : 'Browser'
    case 'paint':
      return `${view.path ? vpathName(view.path) : 'Untitled'} - Agent Paint`
    case 'wordpad':
      return `${view.path ? vpathName(view.path) : 'Document'} - WordPad`
    case 'diagrams':
      return `${view.path ? vpathName(view.path) : view.title} - Agent Diagrams`
    case 'help':
      return helpWindowTitle(view.topic)
    case 'agent-manager':
      return view.tab === 'chats' ? CHATS_WINDOW_TITLE : APP_DISPLAY_NAMES[view.app]
    case 'code-review':
      return reviewWindowTitle(projectName ?? (view.root.length <= 3 ? view.root : vpathName(view.root)))
    default:
      return APP_DISPLAY_NAMES[view.app]
  }
}


/** The file or folder a window shows, when its view has one (Terminal: its working directory). */
export function viewPath(view: AppView): VPath | null {
  if ('path' in view && typeof view.path === 'string' && view.path) return view.path
  if (view.app === 'code') return view.activePath
  if (view.app === 'code-review') return view.root
  if (view.app === 'terminal') return view.cwd
  return null
}

/** Where the aside of a window works: the root of the plugged-in drive its view is on, else the agent's home. */
export function asideCwd(view: AppView, home: VPath = AGENT_HOME): VPath {
  const source = viewPath(view)
  const parsed = source ? parseVPath(source) : null
  return parsed && parsed.drive !== 'C' ? `${parsed.drive}:\\` : home
}
