import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'

export interface NewRecycledChange extends Omit<RecycledChangeDto, 'id' | 'revertedAt' | 'path'> {
  /** The folder the file is in; null for the desktop's C: disk. */
  folderId: Id | null
  /** Relative to that folder / disk, with `/`. */
  path: string
}

/** A recycled change with its storage location (what a restore needs). `path` of the DTO is the VPath. */
export interface RecycledChangeRecord extends RecycledChangeDto {
  folderId: Id | null
  relativePath: string
}

export interface RecycledChangeRepository {
  /** Newest first. DTO paths are VPaths (`?` as drive when the project is not plugged in). */
  list(desktopId: Id): RecycledChangeDto[]
  get(id: Id): RecycledChangeRecord | null
  add(input: NewRecycledChange): RecycledChangeDto
  remove(id: Id): boolean
  /** Removes every row of the desktop; returns how many. */
  removeAll(desktopId: Id): number
}
