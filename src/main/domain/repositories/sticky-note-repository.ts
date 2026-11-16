import type { Bounds, OpenedBy, StickyColor, StickyNoteDto } from '@shared/desktop'
import type { Id } from '@shared/models'

export interface NewStickyNote {
  desktopId: Id
  text: string
  color: StickyColor
  bounds: Bounds
  planSessionId: Id | null
  author: OpenedBy
}

export type StickyNotePatch = Partial<Pick<StickyNoteDto, 'text' | 'color' | 'bounds' | 'planSessionId'>>

export interface StickyNoteRepository {
  /** Oldest first. */
  list(desktopId: Id): StickyNoteDto[]
  get(id: Id): StickyNoteDto | null
  create(input: NewStickyNote): StickyNoteDto
  update(id: Id, patch: StickyNotePatch): StickyNoteDto | null
  remove(id: Id): boolean
}
