import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'

export type NewRecycledChange = Omit<RecycledChangeDto, 'id' | 'revertedAt'>

export interface RecycledChangeRepository {
  /** Newest first. */
  list(desktopId: Id): RecycledChangeDto[]
  get(id: Id): RecycledChangeDto | null
  add(input: NewRecycledChange): RecycledChangeDto
  remove(id: Id): boolean
  /** Removes every row of the desktop; returns how many. */
  removeAll(desktopId: Id): number
}
