import { ipcMain } from 'electron'
import { AGUI_CHANNELS } from '../../shared/ipc-channels'
import type { AguiRunner } from '../application/agui/AguiRunCoordinator'
import { parseRunInput, streamAguiRun } from './streamAguiRun'

/**
 * Registers the AG-UI IPC channels: `agui.run` streams the run's events to the calling window on
 * `agui.event` and resolves when the stream ended; `agui.abort` cancels the session's turn.
 */
export function registerAguiHandlers(runner: AguiRunner, options: { validate: boolean }): () => void {
  ipcMain.handle(AGUI_CHANNELS.run, async (event, raw: unknown) => {
    const input = parseRunInput(raw)
    const sender = event.sender
    await streamAguiRun(
      runner,
      input,
      (message) => {
        if (!sender.isDestroyed()) sender.send(AGUI_CHANNELS.event, message)
      },
      { validate: options.validate, isClosed: () => sender.isDestroyed() }
    )
  })
  ipcMain.handle(AGUI_CHANNELS.abort, (_event, threadId: string, runId: string) => runner.abort(threadId, runId))
  return () => {
    ipcMain.removeHandler(AGUI_CHANNELS.run)
    ipcMain.removeHandler(AGUI_CHANNELS.abort)
  }
}
