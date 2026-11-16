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
  type DesktopState,
  type OpenWindowInput,
  type ToolPolicyDto
} from '@shared/desktop'
import { cascadedBounds, initialView, windowTitle } from '@shared/desktop-views'
import { AGENT_HOME, type DriveDto } from '@shared/vfs'
import { systemDrive, usbDrive } from './fakeVfs'

export { initialView, windowTitle }

export interface FakeDesktopOptions {
  /** The drives of the desktop (default: C: and the sample USB drive E:). */
  drives?: DriveDto[]
  windows?: OpenWindowInput['app'][]
  onChange?: (state: DesktopState) => void
  /** Creates the review session of `openReview` (the fake backend registers it); returns its id. */
  createReviewSession?: (cwd: string) => number
  /** Creates the aside session of `openAside` (the fake backend registers it); returns its id. */
  createAsideSession?: (cwd: string) => number
}

export type FakeDesktopApi = DesktopApi & { state(): DesktopState; /** Plug in / eject: replaces the drives and pushes `desktop.changed`. */ setDrives(drives: DriveDto[]): void }

export function createFakeDesktop(options: FakeDesktopOptions = {}): FakeDesktopApi {
  let nextId = 500
  let policy: ToolPolicyDto = structuredClone(DEFAULT_TOOL_POLICY)
  const desktop = { id: 1, title: 'claude-code-win' }
  const state: DesktopState = {
    desktopId: desktop.id,
    title: desktop.title,
    drives: options.drives ?? [systemDrive(), usbDrive('E', { id: 1, name: 'claude-code-win' })],
    home: AGENT_HOME,
    focusedWindowId: null,
    windows: [],
    tools: enabledToolGroups([]),
    paused: false,
    userInControl: false,
    notes: [],
    surfaces: []
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

  const api: FakeDesktopApi = {
    state: () => structuredClone(state),
    setDrives: (drives) => {
      state.drives = drives
      changed()
    },
    current: async () => structuredClone(state),
    rename: async (_id, title) => {
      state.title = title
      changed()
    },
    openWindow: async (input) => {
      const existing = SINGLETON_APPS.includes(input.app) ? state.windows.find((w) => w.app === input.app) : undefined
      if (existing) {
        if (existing.view.app === 'help' && input.topic !== undefined) existing.view = { app: 'help', topic: input.topic }
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
    newChat: async (_desktopId, _agentId, _cwd) => api.openWindow({ desktopId: desktop.id, app: 'chat', sessionId: nextId }),
    openReview: async (_desktopId, root, baseRef) => api.openWindow({ desktopId: desktop.id, app: 'code-review', path: root, baseRef, sessionId: options.createReviewSession?.(root) ?? nextId++ }),
    openAside: async (_desktopId, windowId) => {
      const w = find(windowId)
      if (w.asideSessionId === undefined) {
        w.asideSessionId = options.createAsideSession?.(AGENT_HOME) ?? nextId++
        changed()
      }
      return w.asideSessionId
    },
    closeAside: async (windowId) => {
      delete find(windowId).asideSessionId
      changed()
    },
    policy: async () => structuredClone(policy),
    setPolicy: async (p) => void (policy = structuredClone(p)),
    attachBrowser: async () => {},
    respondAppRequest: async () => {}
  }
  for (const app of options.windows ?? []) void api.openWindow({ desktopId: desktop.id, app })
  return api
}
