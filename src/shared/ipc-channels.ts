import type { AgentXpApi, AgentXpEventName } from './ipc'

/** The request/response part of the API (everything except the `on` subscription). */
export type InvokeApi = Omit<AgentXpApi, 'on'>

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
