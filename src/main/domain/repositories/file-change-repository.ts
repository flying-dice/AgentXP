import type { FileChangeDto, Id } from '@shared/models'

export interface FileWrite {
  sessionId: Id
  /** The folder (plugged-in project) the file is in; null for the desktop's C: disk. */
  folderId: Id | null
  /** Path relative to the root of that folder / disk, with `/`. */
  path: string
  /** File content before this write; null when the file did not exist. */
  previousText: string | null
  /** File content after this write; null when the file was deleted. */
  newText: string | null
}

/** A change with its storage location (what a revert needs). `path` of the DTO is the VPath. */
export interface FileChangeRecord extends FileChangeDto {
  folderId: Id | null
  relativePath: string
}

export interface FileChangeRepository {
  /** DTO paths are VPaths: the drive letter is looked up in the desktop's drives (`?` when the drive is ejected). */
  list(sessionId: Id): FileChangeDto[]
  get(id: Id): FileChangeRecord | null
  /**
   * Records a write. The first write per (session, folder, path) keeps `previousText` as the
   * original; later writes only move `currentText`. Counts are computed against the
   * original. When the net change is empty the record is removed and null returned.
   */
  record(write: FileWrite): FileChangeDto | null
  remove(id: Id): boolean
}
