import type { DriveLetter } from '@shared/vfs'
import type { Id, IsoDate } from '@shared/models'
import type { RemovedProjectDto } from '@shared/vfs'

/** A project plugged into a desktop as a removable drive (`C:` is not stored). */
export interface DriveRecord {
  desktopId: Id
  letter: DriveLetter
  folderId: Id
  pluggedAt: IsoDate
}

export interface DriveRepository {
  /** Ordered by letter. */
  list(desktopId: Id): DriveRecord[]
  /** Plugs the folder in under `letter`. */
  add(desktopId: Id, letter: DriveLetter, folderId: Id): DriveRecord
  /** Ejects; true when the drive existed. */
  remove(desktopId: Id, letter: DriveLetter): boolean
  /** Desktops that have the folder plugged in. */
  desktopsOfFolder(folderId: Id): Id[]
  /** Projects removed from the desktop, newest first. */
  listRemoved(desktopId: Id): RemovedProjectDto[]
  /** Remembers an ejected project (again: moves it to the front) and keeps the newest `keep` rows. */
  addRemoved(desktopId: Id, project: Pick<RemovedProjectDto, 'folderId' | 'letter' | 'label'>, keep: number): void
  /** Forgets a removed project (it was plugged in again). */
  clearRemoved(desktopId: Id, folderId: Id): void
}
