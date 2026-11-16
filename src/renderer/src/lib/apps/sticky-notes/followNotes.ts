import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { StickyNoteDto } from '@shared/desktop'

/** Loads the notes of a desktop and follows `notes.changed`; returns the stop function. */
export function followNotes(api: Pick<Agent7Api, 'notes' | 'on'>, desktopId: Id, onNotes: (notes: StickyNoteDto[]) => void): () => void {
  let stopped = false
  void api.notes.list(desktopId).then((list) => !stopped && onNotes(list), () => {})
  const off = api.on('notes.changed', (e) => {
    if (e.desktopId === desktopId && !stopped) onNotes(e.notes)
  })
  return () => {
    stopped = true
    off()
  }
}
