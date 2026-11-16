import type { FolderDto, Id } from '@shared/models'

export interface FolderRepository {
  /** Most recently opened first, never-opened folders last (by name). */
  list(): FolderDto[]
  get(id: Id): FolderDto | null
  getByPath(path: string): FolderDto | null
  /** Idempotent on `path`: returns the existing folder when already registered. */
  add(path: string, name: string): FolderDto
  /** Stamps `lastOpenedAt` with the current time. */
  touch(id: Id): void
  remove(id: Id): boolean
}
