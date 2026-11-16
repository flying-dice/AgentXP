import { BrowserWindow } from 'electron'
import type { AgentXpEventName, AgentXpEvents } from '../../shared/ipc'
import type { EventPublisher } from '../application/ports'

/** Sends every event to all open windows. */
export class ElectronEventPublisher implements EventPublisher {
  publish<K extends AgentXpEventName>(event: K, payload: AgentXpEvents[K]): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(event, payload)
    }
  }
}
