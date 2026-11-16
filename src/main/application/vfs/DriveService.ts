import { SYSTEM_DRIVE, nextDriveLetter, type DriveDto, type DriveLetter } from '@shared/vfs'
import type { FolderDto, Id } from '@shared/models'
import type { DesktopRepository } from '../../domain/repositories/desktop-repository'
import type { DriveRepository } from '../../domain/repositories/drive-repository'
import type { FolderRepository } from '../../domain/repositories/folder-repository'
import { AppError, required } from '../errors'

export const SYSTEM_DRIVE_LABEL = 'Local Disk'

export interface DriveServiceDeps {
  drives: DriveRepository
  folders: Pick<FolderRepository, 'get' | 'touch'>
  desktops: Pick<DesktopRepository, 'get'>
  /** The native folder picker; adds the folder to the registry. Resolves null when cancelled. */
  pickFolder(): Promise<FolderDto | null>
}

type DriveListener = (desktopId: Id) => void

/** The drives of a desktop: C: (always) and the projects plugged in as USB drives. */
export class DriveService {
  private readonly listeners = new Set<DriveListener>()

  constructor(private readonly deps: DriveServiceDeps) {}

  /** Called after a drive was plugged in or ejected (the desktop pushes its new state). */
  observe(listener: DriveListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** C: first, then the removable drives by letter. */
  list(desktopId: Id): DriveDto[] {
    const removable = this.deps.drives.list(desktopId).map((d): DriveDto => {
      const folder = this.deps.folders.get(d.folderId)
      return { letter: d.letter, label: folder?.name ?? `Drive ${d.letter}`, kind: 'removable', folderId: d.folderId, pluggedAt: d.pluggedAt }
    })
    return [{ letter: SYSTEM_DRIVE, label: SYSTEM_DRIVE_LABEL, kind: 'system', folderId: null, pluggedAt: null }, ...removable]
  }

  /** Plugs a project in under the first free letter (E:, F:, ...). Plugging the same project again returns its drive. */
  async plugIn(desktopId: Id, folderId?: Id): Promise<DriveDto | null> {
    required(this.deps.desktops.get(desktopId), 'Desktop')
    const folder = folderId === undefined ? await this.deps.pickFolder() : required(this.deps.folders.get(folderId), 'Folder')
    if (!folder) return null
    return this.plugInFolder(desktopId, folder.id)
  }

  /** Synchronous core of `plugIn` (used when a desktop is created with projects). */
  plugInFolder(desktopId: Id, folderId: Id): DriveDto {
    const existing = this.list(desktopId).find((d) => d.folderId === folderId)
    if (existing) return existing
    const letter = nextDriveLetter(this.list(desktopId).map((d) => d.letter))
    if (!letter) throw new AppError('All drive letters (E: to Z:) are in use. Eject a drive first.')
    this.deps.drives.add(desktopId, letter, folderId)
    this.deps.folders.touch(folderId)
    this.changed(desktopId)
    return this.list(desktopId).find((d) => d.letter === letter)!
  }

  /** Safely Remove: the agent loses access at once. */
  eject(desktopId: Id, letter: DriveLetter): void {
    const drive = letter.toUpperCase()
    if (drive === SYSTEM_DRIVE) throw new AppError('The system disk (C:) cannot be removed.')
    required(this.deps.desktops.get(desktopId), 'Desktop')
    if (!this.deps.drives.remove(desktopId, drive)) throw new AppError(`Drive ${drive}: is not plugged in.`)
    this.changed(desktopId)
  }

  private changed(desktopId: Id): void {
    this.listeners.forEach((listener) => listener(desktopId))
  }
}
