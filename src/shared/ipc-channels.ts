import type { AgentXpApi, AgentXpEventName } from './ipc'

/**
 * The request/response part of the API handled generically (everything except the `on`
 * subscription and `agui`, whose streaming handlers need the sending window).
 */
export type InvokeApi = Omit<AgentXpApi, 'on' | 'agui'>

/** AG-UI transport channels. */
export const AGUI_CHANNELS = {
  /** invoke: `RunAgentInput` in, resolves once the run's events have all been sent. */
  run: 'agui.run',
  /** invoke: `(threadId, runId)`. */
  abort: 'agui.abort',
  /** main -> renderer: `AguiEventMessage`. */
  event: 'agui.event'
} as const

/** Push events that reach the renderer (the type forces this list to match `AgentXpEvents`). */
const RENDERER_EVENTS = {
  'session.changed': true,
  'session.removed': true,
  'folders.changed': true,
  'status.message': true
} as const satisfies Record<AgentXpEventName, true>

export const isRendererEvent = (name: string): name is AgentXpEventName => name in RENDERER_EVENTS

/** Every invoke method, as `true` flags. The type forces this list to match `AgentXpApi` exactly. */
const INVOKE_METHODS = {
  agents: { list: true, create: true, update: true, remove: true, setDefault: true },
  folders: { list: true, pick: true, add: true, remove: true, readDir: true, readFile: true },
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
    exportTranscript: true
  },
  a2ui: { dispatch: true },
  shell: { openPath: true }
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

export type { AgentXpEventName }
