/**
 * What each Kanban dialog does on OK. The window clears its `dialog` state as soon as OK is pressed, so the call is built
 * from a snapshot of the dialog first: reading `dialog.columnId` after the clear failed with "Cannot read properties of null".
 */
import type { BoardDto, CardDto, CardInput, ColumnDto, KanbanApi } from '@shared/kanban'
import type { Id } from '@shared/models'

export type KanbanDialog =
  | { kind: 'new-board' }
  | { kind: 'rename-board' }
  | { kind: 'new-column' }
  | { kind: 'rename-column'; column: ColumnDto }
  | { kind: 'new-card'; columnId: Id }
  | { kind: 'edit-card'; card: CardDto }

/** What OK sends: a name (board and list dialogs) or a card (card dialog). */
export type DialogInput = string | Required<CardInput>

export interface SubmitContext {
  desktopId: Id
  /** The board shown now; null when there is none. */
  boardId: Id | null
}

/** The API call for OK on `dialog`, or null when the dialog does not apply (no board for a new list). */
export function submission(dialog: KanbanDialog, input: DialogInput, ctx: SubmitContext): ((api: KanbanApi) => Promise<BoardDto | void>) | null {
  const name = typeof input === 'string' ? input : null
  const card = typeof input === 'string' ? null : input
  switch (dialog.kind) {
    case 'new-board':
      return name === null ? null : (api) => api.createBoard(ctx.desktopId, name)
    case 'rename-board': {
      const boardId = ctx.boardId
      return name === null || boardId === null ? null : (api) => api.renameBoard(boardId, name)
    }
    case 'new-column': {
      const boardId = ctx.boardId
      return name === null || boardId === null ? null : (api) => api.addColumn(boardId, name)
    }
    case 'rename-column': {
      const id = dialog.column.id
      return name === null ? null : (api) => api.renameColumn(id, name)
    }
    case 'new-card': {
      const columnId = dialog.columnId
      return card === null ? null : (api) => api.addCard(columnId, card)
    }
    case 'edit-card': {
      const id = dialog.card.id
      return card === null ? null : (api) => api.updateCard(id, { title: card.title, description: card.description, assignee: card.assignee ?? '' })
    }
  }
}
