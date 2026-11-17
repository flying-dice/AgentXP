import type { AgentXPApi, AgentXPEventName } from './ipc'

/**
 * The request/response part of the API handled generically (everything except the `on`
 * subscription and `agui`, whose streaming handlers need the sending window).
 */
export type InvokeApi = Omit<AgentXPApi, 'on' | 'agui' | 'window'>

/** AG-UI transport channels. */
export const AGUI_CHANNELS = {
  /** invoke: `RunAgentInput` in, resolves once the run's events have all been sent. */
  run: 'agui.run',
  /** invoke: `(threadId, runId)`. */
  abort: 'agui.abort',
  /** main -> renderer: `AguiEventMessage`. */
  event: 'agui.event'
} as const

/** Window chrome channels (handled per sending window, not part of `InvokeApi`). */
export const WINDOW_CHANNELS = {
  minimize: 'window.minimize',
  toggleMaximize: 'window.toggleMaximize',
  close: 'window.close',
  getState: 'window.getState',
  /** main -> renderer: `WindowStateDto`. */
  state: 'window.state'
} as const

/** Push events that reach the renderer (the type forces this list to match `AgentXPEvents`). */
const RENDERER_EVENTS = {
  'session.changed': true,
  'session.removed': true,
  'folders.changed': true,
  'status.message': true,
  'transcript.cleared': true,
  'desktop.changed': true,
  'desktop.appRequest': true,
  'notes.changed': true,
  'kanban.changed': true,
  'events.appended': true,
  'recycle.changed': true,
  'launcher.changed': true,
  'git.changed': true,
  'review.changed': true,
  'room.changed': true,
  'room.removed': true,
  'scheduler.changed': true,
  'config.changed': true
} as const satisfies Record<AgentXPEventName, true>

export const isRendererEvent = (name: string): name is AgentXPEventName => name in RENDERER_EVENTS

/** Every invoke method, as `true` flags. The type forces this list to match `AgentXPApi` exactly. */
const INVOKE_METHODS = {
  agents: { list: true, create: true, update: true, remove: true, setDefault: true, check: true },
  folders: { list: true, pick: true, add: true, remove: true, readDir: true, readFile: true, gitBranch: true, writeFile: true },
  sessions: {
    list: true,
    get: true,
    create: true,
    rename: true,
    remove: true,
    transcript: true,
    tasks: true,
    changes: true,
    terminals: true,
    surfaces: true,
    prompt: true,
    cancel: true,
    setMode: true,
    setModel: true,
    respondPermission: true,
    revertChange: true,
    clearTranscript: true,
    retry: true,
    restartAgent: true,
    exportTranscript: true
  },
  desktop: {
    current: true,
    rename: true,
    openWindow: true,
    closeWindow: true,
    focusWindow: true,
    setBounds: true,
    setWindowState: true,
    updateView: true,
    setPaused: true,
    resumeAgents: true,
    setUserInControl: true,
    newChat: true,
    openReview: true,
    openAside: true,
    closeAside: true,
    openAsideAsChat: true,
    policy: true,
    setPolicy: true,
    attachBrowser: true,
    respondAppRequest: true,
    raiseWindow: true,
    userActive: true
  },
  vfs: { readDir: true, readFile: true, writeFile: true, stat: true, readBytes: true, writeBytes: true },
  git: { status: true, lineChanges: true, headText: true, revertHunk: true, init: true },
  scheduler: { list: true, create: true, update: true, remove: true, setEnabled: true, run: true, end: true, history: true, clearHistory: true },
  review: { changes: true, file: true, state: true, addComment: true, setState: true, remove: true, markSent: true },
  drives: { list: true, plugIn: true, eject: true },
  launcher: { list: true, create: true, connect: true, disconnect: true, rename: true, remove: true, show: true, checkAgents: true },
  skills: { list: true, install: true, remove: true, setEnabled: true },
  mcp: { list: true, add: true, update: true, remove: true, setEnabled: true, test: true, probe: true, setToolEnabled: true },
  profiles: { list: true, create: true, update: true, remove: true },
  teams: { list: true, create: true, update: true, remove: true },
  rooms: { list: true, create: true, state: true, remove: true, rename: true, say: true, stop: true },
  notes: { list: true, add: true, update: true, remove: true },
  kanban: { list: true, createBoard: true, renameBoard: true, deleteBoard: true, addColumn: true, renameColumn: true, moveColumn: true, deleteColumn: true, addCard: true, updateCard: true, moveCard: true, deleteCard: true },
  events: { query: true, clear: true },
  recycle: { list: true, restore: true, remove: true, empty: true },
  snip: { capture: true, save: true },
  processes: { list: true, end: true },
  app: { version: true },
  a2ui: { dispatch: true, deleteSurface: true, moveSurface: true, setSidebarHidden: true },
  shell: { openPath: true },
  fs: { browse: true, makeFolder: true, nativePicker: true },
  dialogs: { pickFiles: true }
} as const satisfies { [G in keyof InvokeApi]: { [M in keyof InvokeApi[G]]: true } }

export interface InvokeChannel {
  group: keyof InvokeApi
  method: string
  /** The `ipcMain.handle` channel: `<group>.<method>`. */
  channel: string
}

/** All invoke channels derived from the single list above. */
export const INVOKE_CHANNELS: readonly InvokeChannel[] = (Object.keys(INVOKE_METHODS) as (keyof InvokeApi)[]).flatMap(
  (group) => Object.keys(INVOKE_METHODS[group]).map((method) => ({ group, method, channel: `${group}.${method}` }))
)

/** Strips Electron's "Error invoking remote method" wrapper so the message reads naturally. */
export const readableIpcError = (message: string): string =>
  message.replace(/^Error invoking remote method '[^']*': (?:\w*Error: )?/, '')

export type { AgentXPEventName }
