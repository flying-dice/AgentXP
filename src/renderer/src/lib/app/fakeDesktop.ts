/**
 * In-memory DesktopApi for Storybook and tests. Mirrors what DesktopService
 * does in main: window rows, focus, z-order and the derived tool groups.
 */
import type { Id } from '@shared/models'
import {
  APP_DISPLAY_NAMES,
  DEFAULT_TOOL_POLICY,
  SINGLETON_APPS,
  enabledToolGroups,
  type AppKind,
  type AppView,
  type AppWindowState,
  type Bounds,
  type DesktopApi,
  type DesktopDto,
  type DesktopState,
  type OpenWindowInput,
  type ToolPolicyDto
} from '@shared/desktop'

const DEFAULT_BOUNDS: Record<AppKind, Bounds> = {
  chat: { x: 40, y: 40, width: 640, height: 520 },
  explorer: { x: 120, y: 80, width: 620, height: 420 },
  notepad: { x: 200, y: 120, width: 520, height: 380 },
  code: { x: 80, y: 60, width: 820, height: 560 },
  terminal: { x: 160, y: 300, width: 640, height: 300 },
  browser: { x: 100, y: 50, width: 860, height: 600 },
  'control-centre': { x: 180, y: 90, width: 640, height: 460 },
  'agent-manager': { x: 220, y: 110, width: 560, height: 400 }
}

export function initialView(input: OpenWindowInput, title = 'Chat'): AppView {
  switch (input.app) {
    case 'chat':
      return { app: 'chat', sessionId: input.sessionId ?? 0, title }
    case 'explorer':
      return { app: 'explorer', path: input.path ?? '', selected: [] }
    case 'notepad':
      return { app: 'notepad', path: input.path ?? null, dirty: false, caretLine: 1 }
    case 'code':
      return { app: 'code', tabs: input.path ? [input.path] : [], activePath: input.path ?? null, visibleLines: null, selection: null, selectedChangeId: null }
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

export interface FakeDesktopOptions {
  folder?: DesktopState['folder']
  windows?: OpenWindowInput['app'][]
  onChange?: (state: DesktopState) => void
}

export function createFakeDesktop(options: FakeDesktopOptions = {}): DesktopApi & { state(): DesktopState } {
  let nextId = 500
  let policy: ToolPolicyDto = structuredClone(DEFAULT_TOOL_POLICY)
  const desktop: DesktopDto = { id: 1, folderId: 1, agentId: 1, title: 'claude-code-win', isOpen: true, createdAt: '2026-11-16T09:00:00Z' }
  const state: DesktopState = {
    desktopId: desktop.id,
    title: desktop.title,
    folder: options.folder ?? { id: 1, name: 'claude-code-win', path: 'C:\\Users\\jonathan\\source\\claude-code-win' },
    focusedWindowId: null,
    windows: [],
    tools: enabledToolGroups([]),
    paused: false,
    userInControl: false
  }
  const changed = (): void => {
    state.tools = enabledToolGroups(state.windows.map((w) => w.app))
    options.onChange?.(structuredClone(state))
  }
  const find = (id: Id): AppWindowState => {
    const w = state.windows.find((x) => x.id === id)
    if (!w) throw new Error(`No window ${id}`)
    return w
  }
  const raise = (w: AppWindowState): void => {
    state.windows = [...state.windows.filter((x) => x !== w), w]
    state.focusedWindowId = w.id
  }

  const api: DesktopApi & { state(): DesktopState } = {
    state: () => structuredClone(state),
    list: async () => [desktop],
    current: async () => structuredClone(state),
    create: async () => desktop,
    open: async () => {},
    rename: async (_id, title) => {
      state.title = title
      changed()
    },
    remove: async () => {},
    openWindow: async (input) => {
      const existing = SINGLETON_APPS.includes(input.app) ? state.windows.find((w) => w.app === input.app) : undefined
      if (existing) {
        raise(existing)
        changed()
        return existing
      }
      const view = initialView(input)
      const offset = (state.windows.length % 6) * 24
      const b = DEFAULT_BOUNDS[input.app]
      const w: AppWindowState = {
        id: nextId++,
        app: input.app,
        title: windowTitle(view),
        bounds: { ...b, x: b.x + offset, y: b.y + offset },
        windowState: 'normal',
        openedBy: 'user',
        view
      }
      state.windows.push(w)
      raise(w)
      changed()
      return w
    },
    closeWindow: async (id) => {
      state.windows = state.windows.filter((w) => w.id !== id)
      if (state.focusedWindowId === id) state.focusedWindowId = state.windows.at(-1)?.id ?? null
      changed()
    },
    focusWindow: async (id) => {
      const w = find(id)
      if (w.windowState === 'minimized') w.windowState = 'normal'
      raise(w)
      changed()
    },
    setBounds: async (id, bounds) => {
      find(id).bounds = bounds
      changed()
    },
    setWindowState: async (id, ws) => {
      const w = find(id)
      w.windowState = ws
      if (ws === 'minimized' && state.focusedWindowId === id) state.focusedWindowId = null
      changed()
    },
    updateView: async (id, view) => {
      const w = find(id)
      w.view = view
      w.title = windowTitle(view)
      changed()
    },
    setPaused: async (_id, paused) => {
      state.paused = paused
      changed()
    },
    setUserInControl: async (_id, on) => {
      state.userInControl = on
      changed()
    },
    newChat: async () => api.openWindow({ desktopId: desktop.id, app: 'chat', sessionId: nextId }),
    policy: async () => structuredClone(policy),
    setPolicy: async (p) => void (policy = structuredClone(p))
  }
  for (const app of options.windows ?? []) void api.openWindow({ desktopId: desktop.id, app })
  return api
}
