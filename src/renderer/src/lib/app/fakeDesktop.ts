/**
 * In-memory DesktopApi for Storybook and tests. Mirrors what DesktopService
 * does in main: window rows, focus, z-order and the derived tool groups.
 */
import type { Id } from '@shared/models'
import {
  DEFAULT_TOOL_POLICY,
  SINGLETON_APPS,
  enabledToolGroups,
  type AppWindowState,
  type DesktopApi,
  type DesktopDto,
  type DesktopState,
  type OpenWindowInput,
  type ToolPolicyDto
} from '@shared/desktop'
import { cascadedBounds, initialView, windowTitle } from '@shared/desktop-views'

export { initialView, windowTitle }

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
    userInControl: false,
    notes: []
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
      const w: AppWindowState = {
        id: nextId++,
        app: input.app,
        title: windowTitle(view),
        bounds: cascadedBounds(input.app, state.windows.length),
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
    setPolicy: async (p) => void (policy = structuredClone(p)),
    attachBrowser: async () => {},
    respondAppRequest: async () => {}
  }
  for (const app of options.windows ?? []) void api.openWindow({ desktopId: desktop.id, app })
  return api
}
