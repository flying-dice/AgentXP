import { contextBridge, ipcRenderer } from 'electron'
import type { AgentXpApi, AgentXpEventName, AgentXpEvents, AguiApi, AguiEventMessage } from '../shared/ipc'
import { AGUI_CHANNELS, INVOKE_CHANNELS, readableIpcError, type InvokeApi } from '../shared/ipc-channels'

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

const agui: AguiApi = {
  run: async (input) => {
    await invoke(AGUI_CHANNELS.run)(input)
  },
  abort: async (threadId, runId) => {
    await invoke(AGUI_CHANNELS.abort)(threadId, runId)
  },
  onEvent: (runId, listener) => {
    const handler = (_event: Electron.IpcRendererEvent, message: AguiEventMessage): void => {
      if (message.runId === runId) listener(message.event)
    }
    ipcRenderer.on(AGUI_CHANNELS.event, handler)
    return () => {
      ipcRenderer.removeListener(AGUI_CHANNELS.event, handler)
    }
  }
}

const api: AgentXpApi = { ...buildInvokeApi(), agui, on }

contextBridge.exposeInMainWorld('agentxp', api)
