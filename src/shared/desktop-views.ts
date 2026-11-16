/**
 * Pure helpers shared by main (`DesktopService`) and the renderer's fake desktop:
 * default window bounds, the initial view of a new window and window titles.
 */
import { APP_DISPLAY_NAMES, type AppKind, type AppView, type Bounds, type OpenWindowInput } from './desktop'

export const DEFAULT_BOUNDS: Record<AppKind, Bounds> = {
  chat: { x: 40, y: 40, width: 640, height: 520 },
  explorer: { x: 120, y: 80, width: 620, height: 420 },
  notepad: { x: 200, y: 120, width: 520, height: 380 },
  code: { x: 80, y: 60, width: 820, height: 560 },
  terminal: { x: 160, y: 300, width: 640, height: 300 },
  browser: { x: 100, y: 50, width: 860, height: 600 },
  'control-centre': { x: 180, y: 90, width: 640, height: 460 },
  'agent-manager': { x: 220, y: 110, width: 560, height: 400 }
}

/** Default bounds of a new window, cascaded by the number of windows already open. */
export function cascadedBounds(app: AppKind, openCount: number): Bounds {
  const offset = (openCount % 6) * 24
  const b = DEFAULT_BOUNDS[app]
  return { ...b, x: b.x + offset, y: b.y + offset }
}

export function initialView(input: Pick<OpenWindowInput, 'app' | 'path' | 'url' | 'sessionId'>, title = 'Chat'): AppView {
  switch (input.app) {
    case 'chat':
      return { app: 'chat', sessionId: input.sessionId ?? 0, title }
    case 'explorer':
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
      return { app: 'terminal', terminalId: null, cwd: '', runningCommand: null, lastLines: [] }
    case 'browser':
      return { app: 'browser', url: input.url ?? 'about:blank', title: '', loading: false }
    case 'control-centre':
      return { app: 'control-centre', page: 'agents' }
    case 'agent-manager':
      return { app: 'agent-manager' }
  }
}

export function windowTitle(view: AppView): string {
  switch (view.app) {
    case 'chat':
      return view.title
    case 'explorer':
      return view.path ? `W:\\${view.path.replaceAll('/', '\\')}` : 'Workspace (W:)'
    case 'notepad':
      return `${view.path?.split('/').pop() ?? 'Untitled'} - Notepad`
    case 'code':
      return view.activePath ? `${view.activePath.split('/').pop()} - Code` : 'Code'
    case 'browser':
      return view.title ? `${view.title} - Browser` : 'Browser'
    default:
      return APP_DISPLAY_NAMES[view.app]
  }
}

