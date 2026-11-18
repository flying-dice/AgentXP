import type { DesktopDto } from '@shared/desktop'
import type { Id, IsoDate } from '@shared/models'

/** A desktop row: the shared DTO plus the flags only main needs. */
export interface DesktopRecord extends DesktopDto {
  paused: boolean
  userInControl: boolean
  lastUsedAt: IsoDate
}

export interface NewDesktop {
  agentId: Id | null
  title: string
  isOpen: boolean
}

export interface DesktopRepository {
  list(): DesktopRecord[]
  /** The connected desktops (an OS window shows them). */
  listOpen(): DesktopRecord[]
  get(id: Id): DesktopRecord | null
  create(input: NewDesktop): DesktopRecord
  rename(id: Id, title: string): void
  setAgent(id: Id, agentId: Id): void
  setOpen(id: Id, isOpen: boolean): void
  /** Marks every desktop disconnected (app start: no window shows any). */
  closeAll(): void
  /** Stamps `lastUsedAt` with the current time. */
  touch(id: Id): void
  setPaused(id: Id, paused: boolean): void
  setUserInControl(id: Id, on: boolean): void
  /** The chats whose step the last Pause stopped, oldest first. */
  stoppedChats(id: Id): Id[]
  /** Replaces the saved list (an empty list clears it). */
  setStoppedChats(id: Id, sessionIds: readonly Id[]): void
  /** Cascades to the desktop's chats, windows, drives, notes and recycled changes. */
  remove(id: Id): boolean
}
