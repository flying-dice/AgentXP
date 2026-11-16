import { BrowserWindow } from 'electron'
import { isRendererEvent } from '../../shared/ipc-channels'
import type { AppEventName, AppEvents, EventPublisher } from '../application/ports'

/** Sends the renderer-facing events to all open windows; internal events (AG-UI backend input) stay in main. */
export class ElectronEventPublisher implements EventPublisher {
  publish<K extends AppEventName>(event: K, payload: AppEvents[K]): void {
    if (!isRendererEvent(event)) return
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(event, payload)
    }
  }
}
