import type { WebContents } from 'electron'
import type { Id } from '@shared/models'
import { isRendererEvent } from '../../shared/ipc-channels'
import type { AppEventName, AppEvents, EventPublisher } from '../application/ports'

export interface WindowDirectory {
  /** The renderer of the OS window that shows the desktop, if it is open. */
  webContentsOf(desktopId: Id): WebContents | null
  /** Every renderer. */
  all(): WebContents[]
}

/** The desktop an event belongs to; null for events every window shows (folders, status bar). */
function desktopOf<K extends AppEventName>(event: K, payload: AppEvents[K]): Id | null {
  switch (event) {
    case 'desktop.changed':
      return (payload as AppEvents['desktop.changed']).desktopId
    case 'session.changed':
      return (payload as AppEvents['session.changed']).desktopId ?? null
    case 'desktop.appRequest':
      return (payload as AppEvents['desktop.appRequest']).desktopId
    case 'notes.changed':
      return (payload as AppEvents['notes.changed']).desktopId
    case 'recycle.changed':
      return (payload as AppEvents['recycle.changed']).desktopId
    case 'git.changed':
      return (payload as AppEvents['git.changed']).desktopId
    case 'review.changed':
      return (payload as AppEvents['review.changed']).desktopId
    case 'events.appended':
      return (payload as AppEvents['events.appended'])[0]?.desktopId ?? null
    default:
      return null
  }
}

/**
 * Sends the renderer-facing events to windows: desktop and chat events only to the window of the
 * owning desktop, the rest to all. Internal events (AG-UI backend input) stay in main.
 */
export class ElectronEventPublisher implements EventPublisher {
  constructor(private readonly windows: WindowDirectory) {}

  publish<K extends AppEventName>(event: K, payload: AppEvents[K]): void {
    if (!isRendererEvent(event)) return
    const desktopId = desktopOf(event, payload)
    const targets = desktopId === null ? this.windows.all() : [this.windows.webContentsOf(desktopId)]
    for (const contents of targets) if (contents && !contents.isDestroyed()) contents.send(event, payload)
  }
}
