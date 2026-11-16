import type { FileChangeDto, Id } from '@shared/models'

export interface FileWrite {
  sessionId: Id
  path: string
  /** File content before this write; null when the file did not exist. */
  previousText: string | null
  /** File content after this write; null when the file was deleted. */
  newText: string | null
}

export interface FileChangeRepository {
  list(sessionId: Id): FileChangeDto[]
  get(id: Id): FileChangeDto | null
  /**
   * Records a write. The first write per (session, path) keeps `previousText` as the
   * original; later writes only move `currentText`. Counts are computed against the
   * original. When the net change is empty the record is removed and null returned.
   */
  record(write: FileWrite): FileChangeDto | null
  remove(id: Id): boolean
}
