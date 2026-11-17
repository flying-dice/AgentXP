import { contextBridge, ipcRenderer } from 'electron'
import type { AgentXPApi, AgentXPEventName, AgentXPEvents, AguiApi, AguiEventMessage, WindowApi, WindowStateDto } from '../shared/ipc'
import { AGUI_CHANNELS, INVOKE_CHANNELS, WINDOW_CHANNELS, readableIpcError, type InvokeApi } from '../shared/ipc-channels'

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

const on: AgentXPApi['on'] = <K extends AgentXPEventName>(event: K, listener: (payload: AgentXPEvents[K]) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, payload: AgentXPEvents[K]): void => listener(payload)
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

const windowApi: WindowApi = {
  minimize: async () => void (await invoke(WINDOW_CHANNELS.minimize)()),
  toggleMaximize: async () => void (await invoke(WINDOW_CHANNELS.toggleMaximize)()),
  close: async () => void (await invoke(WINDOW_CHANNELS.close)()),
  getState: async () => (await invoke(WINDOW_CHANNELS.getState)()) as WindowStateDto,
  onStateChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: WindowStateDto): void => listener(state)
    ipcRenderer.on(WINDOW_CHANNELS.state, handler)
    return () => {
      ipcRenderer.removeListener(WINDOW_CHANNELS.state, handler)
    }
  }
}

const api: AgentXPApi = { ...buildInvokeApi(), window: windowApi, agui, on }

contextBridge.exposeInMainWorld('agentxp', api)
