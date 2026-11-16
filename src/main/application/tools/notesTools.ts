import type { StickyNoteDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'
import type { StickyNoteService } from '../desktop/StickyNoteService'
import { AppError } from '../errors'

export interface NotesToolsDeps {
  notes: Pick<StickyNoteService, 'list' | 'add' | 'update' | 'remove'>
}

const describe = (n: StickyNoteDto): string =>
  `#${n.id} [${n.color}] (${n.author}${n.planSessionId === null ? '' : `, plan of chat ${n.planSessionId}`}) ${n.planSessionId === null ? n.text : '(live task list)'}`

/** notes_list, notes_add, notes_update, notes_remove. Notes the agent makes have author "agent". */
export function createNotesTools({ notes }: NotesToolsDeps): ToolHandlers<'notes_list' | 'notes_add' | 'notes_update' | 'notes_remove'> {
  const own = (desktopId: Id, id: Id): StickyNoteDto => {
    const note = notes.list(desktopId).find((n) => n.id === id)
    if (!note) throw new AppError(`Note ${id} does not exist on this desktop. Call notes_list.`)
    return note
  }

  return {
    notes_list: async (_args, { desktopId }) => {
      const all = notes.list(desktopId)
      return textResult(all.length === 0 ? 'No sticky notes.' : all.map(describe).join('\n'))
    },

    notes_add: ({ text, color, plan }, { desktopId, sessionId }) =>
      attempt(() => {
        const note = notes.add(desktopId, plan ? '' : text, color, { author: 'agent', planSessionId: plan ? sessionId : null })
        return textResult(`Added note ${describe(note)}`)
      }),

    notes_update: ({ id, text, color }, { desktopId }) =>
      attempt(() => {
        own(desktopId, id)
        return textResult(`Updated note ${describe(notes.update(id, { text, color }))}`)
      }),

    notes_remove: ({ id }, { desktopId }) =>
      attempt(() => {
        own(desktopId, id)
        notes.remove(id)
        return textResult(`Removed note ${id}.`)
      })
  }
}
