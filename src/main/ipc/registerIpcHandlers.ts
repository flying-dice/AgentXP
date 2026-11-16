import { ipcMain } from 'electron'
import { INVOKE_CHANNELS, type InvokeApi } from '../../shared/ipc-channels'

type Handler = (...args: unknown[]) => unknown

const groupOf = (api: InvokeApi, group: keyof InvokeApi): Record<string, Handler> =>
  api[group] as unknown as Record<string, Handler>

/** Registers one `ipcMain.handle` per API method; the channel is the key path (e.g. `sessions.create`). */
export function registerIpcHandlers(api: InvokeApi): () => void {
  for (const { group, method, channel } of INVOKE_CHANNELS) {
    const handler = groupOf(api, group)[method]
    ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args))
  }
  return () => INVOKE_CHANNELS.forEach(({ channel }) => ipcMain.removeHandler(channel))
}
