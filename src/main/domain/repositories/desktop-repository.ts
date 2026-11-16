import type { DesktopDto } from '@shared/desktop'
import type { Id } from '@shared/models'

/** A desktop row: the shared DTO plus the flags only main needs. */
export interface DesktopRecord extends DesktopDto {
  paused: boolean
  userInControl: boolean
}

export interface NewDesktop {
  folderId: Id
  agentId: Id | null
  title: string
  isOpen: boolean
}

export interface DesktopRepository {
  list(): DesktopRecord[]
  listOpen(): DesktopRecord[]
  get(id: Id): DesktopRecord | null
  /** Oldest desktop of the folder, if any. */
  findByFolder(folderId: Id): DesktopRecord | null
  create(input: NewDesktop): DesktopRecord
  rename(id: Id, title: string): void
  setOpen(id: Id, isOpen: boolean): void
  setPaused(id: Id, paused: boolean): void
  setUserInControl(id: Id, on: boolean): void
  remove(id: Id): boolean
}
