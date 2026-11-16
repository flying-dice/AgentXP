import { ipcMain, type WebContents } from 'electron'
import { INVOKE_CHANNELS, type InvokeApi } from '../../shared/ipc-channels'

type Handler = (...args: unknown[]) => unknown
/** A handler that needs to know which window called. */
export type SenderHandler = (sender: WebContents, ...args: unknown[]) => unknown

const groupOf = (api: InvokeApi, group: keyof InvokeApi): Record<string, Handler> =>
  api[group] as unknown as Record<string, Handler>

/**
 * Registers one `ipcMain.handle` per API method; the channel is the key path (e.g. `sessions.create`).
 * Channels in `perSender` (e.g. `desktop.current`) are answered by those handlers instead, with the calling window.
 */
export function registerIpcHandlers(api: InvokeApi, perSender: Record<string, SenderHandler> = {}): () => void {
  for (const { group, method, channel } of INVOKE_CHANNELS) {
    const bound = perSender[channel]
    if (bound) {
      ipcMain.handle(channel, (event, ...args: unknown[]) => bound(event.sender, ...args))
      continue
    }
    const handler = groupOf(api, group)[method]
    ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args))
  }
  return () => INVOKE_CHANNELS.forEach(({ channel }) => ipcMain.removeHandler(channel))
}
