import type { AppKind, Bounds, OpenedBy, WindowState } from '@shared/desktop'
import type { Id } from '@shared/models'

/** A persisted window: the common columns plus whatever its subtype table holds. */
export interface AppWindowRecord {
  id: Id
  desktopId: Id
  app: AppKind
  bounds: Bounds
  windowState: WindowState
  zOrder: number
  openedBy: OpenedBy
  /** chat windows */
  sessionId: Id | null
  /** explorer, notepad and code windows: VPath */
  path: string | null
  /** browser windows */
  url: string | null
}

export interface NewAppWindow {
  desktopId: Id
  app: AppKind
  bounds: Bounds
  windowState: WindowState
  openedBy: OpenedBy
  sessionId?: Id
  path?: string | null
  url?: string
}

export interface AppWindowRepository {
  /** Back to front. */
  list(desktopId: Id): AppWindowRecord[]
  get(id: Id): AppWindowRecord | null
  findChatWindow(sessionId: Id): AppWindowRecord | null
  /** The new window goes on top (highest z-order). */
  create(input: NewAppWindow): AppWindowRecord
  remove(id: Id): boolean
  setBounds(id: Id, bounds: Bounds): void
  setWindowState(id: Id, state: WindowState): void
  /** Moves the window on top of the others of its desktop. */
  raise(id: Id): void
  setPath(id: Id, path: string | null): void
  setUrl(id: Id, url: string): void
}
