import { contextBridge, ipcRenderer } from 'electron'
import type { AgentXpApi, AgentXpEventName, AgentXpEvents } from '../shared/ipc'
import { INVOKE_CHANNELS, readableIpcError, type InvokeApi } from '../shared/ipc-channels'

type Invoker = (...args: unknown[]) => Promise<unknown>

const invoke =
  (channel: string): Invoker =>
  async (...args) => {
    try {
      return await ipcRenderer.invoke(channel, ...args)
    } catch (error) {
      throw new Error(readableIpcError(error instanceof Error ? error.message : String(error)))
    }
  }

/** Builds `{ group: { method: invoker } }` from the shared channel list. */
function buildInvokeApi(): InvokeApi {
  const groups: Record<string, Record<string, Invoker>> = {}
  for (const { group, method, channel } of INVOKE_CHANNELS) {
    groups[group] ??= {}
    groups[group][method] = invoke(channel)
  }
  return groups as unknown as InvokeApi
}

const on: AgentXpApi['on'] = <K extends AgentXpEventName>(event: K, listener: (payload: AgentXpEvents[K]) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, payload: AgentXpEvents[K]): void => listener(payload)
  ipcRenderer.on(event, handler)
  return () => {
    ipcRenderer.removeListener(event, handler)
  }
}

const api: AgentXpApi = { ...buildInvokeApi(), on }

contextBridge.exposeInMainWorld('agentxp', api)
