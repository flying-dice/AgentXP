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
  code: { x: 80, y: 60, width: 820, height: 560 },
  terminal: { x: 160, y: 300, width: 640, height: 300 },
  browser: { x: 100, y: 50, width: 860, height: 600 },
  'control-centre': { x: 180, y: 90, width: 760, height: 540 },
  'agent-manager': { x: 220, y: 110, width: 640, height: 440 },
  paint: { x: 140, y: 70, width: 860, height: 640 },
  wordpad: { x: 170, y: 80, width: 700, height: 520 },
  'sticky-notes': { x: 600, y: 60, width: 360, height: 420 },
  'event-viewer': { x: 130, y: 90, width: 980, height: 560 },
  'snipping-tool': { x: 300, y: 140, width: 420, height: 220 },
  'recycle-bin': { x: 240, y: 120, width: 680, height: 420 },
  surface: { x: 260, y: 100, width: 480, height: 360 },
  help: { x: 150, y: 70, width: 800, height: 560 },
  'code-review': { x: 50, y: 30, width: 1120, height: 650 }
}

/** Smallest size of a window: 480 x 320, Control Center 640 x 420. */
export const MIN_WINDOW_SIZES: Partial<Record<AppKind, { width: number; height: number }>> = { 'control-centre': { width: 640, height: 420 } }
export const DEFAULT_MIN_WINDOW_SIZE = { width: 480, height: 320 } as const
export const minWindowSize = (app: AppKind): { width: number; height: number } => MIN_WINDOW_SIZES[app] ?? DEFAULT_MIN_WINDOW_SIZE

/** Height of the top bar of the desktop; a new window starts below it (with a gap of 4). */
export const TOP_BAR_HEIGHT = 30
/** The lowest `y` a new window is placed at. */
export const WINDOW_MIN_Y = TOP_BAR_HEIGHT + 4

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
  return { ...b, ...(size ?? {}), x: b.x + offset, y: b.y + offset }
}

/**
 * The desktop area new windows are placed in. Main does not know the real viewport; this is the
 * default Agent7 window (1280x800) minus the top bar and the taskbar.
 */
export const DESKTOP_AREA = { width: 1280, height: 730 } as const

/** Gap kept between a new window and the window it avoids. */
const PLACEMENT_GAP = 8
/** Smallest size a new window is squeezed to when it is tiled into the space beside another window. */
const MIN_TILE = { width: 360, height: 220 }

const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** Moves (and, when it is larger than the area, shrinks) `b` so it lies inside `area`. */
function within(b: Bounds, area: { width: number; height: number }): Bounds {
  const width = Math.min(b.width, area.width)
  const height = Math.min(b.height, Math.max(1, area.height - WINDOW_MIN_Y))
  return { x: clamp(b.x, 0, area.width - width), y: clamp(b.y, WINDOW_MIN_Y, Math.max(WINDOW_MIN_Y, area.height - height)), width, height }
}

/**
 * Bounds of a new window. Without a window to avoid this is the cascade (`cascadedBounds`). With one
 * (the focused chat: the user is typing in it) the window is tiled where it does not cover it, in this order:
 * to the right, below, to the left, above at full size, then squeezed into the room to the right or below.
 * When there is no room at all it falls back to the cascade (overlap cannot be avoided). Always inside `area`.
 */
export function placeWindow(
  app: AppKind,
  openCount: number,
  avoid: Bounds | null,
  area: { width: number; height: number } = DESKTOP_AREA,
  size?: { width: number; height: number }
): Bounds {
  const base = within(cascadedBounds(app, openCount, size), area)
  if (!avoid || !overlaps(base, avoid)) return base
  const { width, height } = base
  const top = clamp(avoid.y, WINDOW_MIN_Y, Math.max(WINDOW_MIN_Y, area.height - height))
  const left = clamp(avoid.x, 0, area.width - width)
  const rightX = avoid.x + avoid.width + PLACEMENT_GAP
  const belowY = avoid.y + avoid.height + PLACEMENT_GAP
  const exact: Bounds[] = [
    { x: rightX, y: top, width, height },
    { x: left, y: belowY, width, height },
    { x: avoid.x - PLACEMENT_GAP - width, y: top, width, height },
    { x: left, y: avoid.y - PLACEMENT_GAP - height, width, height }
  ]
  const fits = exact.find((b) => b.x >= 0 && b.y >= WINDOW_MIN_Y && b.x + b.width <= area.width && b.y + b.height <= area.height)
  if (fits) return fits
  const roomRight = area.width - rightX
  if (roomRight >= MIN_TILE.width) return { x: rightX, y: top, width: roomRight, height }
  const roomBelow = area.height - belowY
  if (roomBelow >= MIN_TILE.height) return { x: left, y: belowY, width, height: roomBelow }
  return base
}

export function initialView(input: Pick<OpenWindowInput, 'app' | 'path' | 'url' | 'sessionId' | 'surfaceId' | 'topic' | 'baseRef'>, title = 'Chat'): AppView {
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
    case 'code-review':
      return { app: 'code-review', root: input.path ?? AGENT_HOME, baseRef: input.baseRef ?? 'HEAD', selectedPath: null, sessionId: input.sessionId ?? 0 }
  }
}

/** The program name of every Help window (UX-44): the same whatever topic it shows. */
export const HELP_PROGRAM_NAME = 'Agent7 Help and Support'

/** "Agent7 Help and Support: Using Notepad" for the topic of an app, "Agent7 Help and Support" for the home, desktop, launcher and Help topics. */
export function helpWindowTitle(topic: string): string {
  const kind = (APP_KINDS as readonly string[]).includes(topic) ? (topic as AppKind) : null
  return kind && kind !== 'help' ? `${HELP_PROGRAM_NAME}: Using ${APP_DISPLAY_NAMES[kind]}` : HELP_PROGRAM_NAME
}

export function windowTitle(view: AppView): string {
  switch (view.app) {
    case 'chat':
      return view.title
    case 'surface':
      return `${view.title} - from the assistant`
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
    case 'help':
      return helpWindowTitle(view.topic)
    case 'code-review':
      return `${view.root.length <= 3 ? view.root : vpathName(view.root)} - Code Review`
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
