import type { GitStatusDto } from '@shared/git'
import type { FileChangeDto } from '@shared/models'
import { normaliseVPath, parseVPath, type DriveLetter } from '@shared/vfs'

/** The root of a drive: where the Changes pane asks Git for its status. */
export const driveRootOf = (drive: DriveLetter): string => `${drive}:\\`

/** The drives of a change list, without repeats. */
export function changeDrives(changes: readonly Pick<FileChangeDto, 'path'>[]): DriveLetter[] {
  const drives = new Set<DriveLetter>()
  for (const c of changes) {
    const drive = parseVPath(c.path)?.drive
    if (drive) drives.add(drive)
  }
  return [...drives]
}

/**
 * The changes that are still uncommitted. A change leaves the list once Git lists its file as clean (committed, or the
 * file was put back). Drives that are not in a repository (`null`) and drives whose status is not known yet (missing)
 * keep their changes: without a commit there is nothing to compare with.
 */
export function uncommittedChanges<T extends Pick<FileChangeDto, 'path'>>(changes: readonly T[], statuses: ReadonlyMap<DriveLetter, GitStatusDto | null>): T[] {
  const dirty = new Map<DriveLetter, Set<string>>()
  for (const [drive, status] of statuses) {
    if (status) dirty.set(drive, new Set(status.entries.map((e) => (normaliseVPath(e.path) ?? e.path).toLowerCase())))
  }
  return changes.filter((c) => {
    const drive = parseVPath(c.path)?.drive
    const set = drive ? dirty.get(drive) : undefined
    if (!set) return true
    return set.has((normaliseVPath(c.path) ?? c.path).toLowerCase())
  })
}
