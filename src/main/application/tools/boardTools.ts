import { describeBoard, type BoardDto } from '@shared/kanban'
import type { Id } from '@shared/models'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'
import type { KanbanService } from '../kanban/KanbanService'
import { AppError } from '../errors'

export interface BoardToolsDeps {
  kanban: Pick<
    KanbanService,
    | 'list' | 'find' | 'board' | 'createBoard' | 'renameBoard' | 'deleteBoard' | 'addColumn' | 'renameColumn' | 'deleteColumn'
    | 'addCard' | 'updateCard' | 'moveCard' | 'deleteCard' | 'desktopOfBoard' | 'desktopOfColumn' | 'desktopOfCard' | 'boardOfCard'
  >
}

type Names = 'board_list' | 'board_get' | 'board_create' | 'board_rename' | 'board_delete' | 'board_add_column' | 'board_rename_column' | 'board_delete_column' | 'board_add_card' | 'board_update_card' | 'board_move_card' | 'board_delete_card'

/** board_*: the Kanban boards of the caller's desktop. Always available; the Kanban window follows along when it is open. */
export function createBoardTools({ kanban }: BoardToolsDeps): ToolHandlers<Names> {
  /** Agents only touch what lives on their own desktop. */
  const mine = (desktopId: Id, owner: Id): void => {
    if (owner !== desktopId) throw new AppError('That does not exist on this desktop. Call board_list.')
  }
  const shown = (board: BoardDto) => textResult(describeBoard(board))

  const boardOrOnly = (desktopId: Id, ref: number | string | undefined): BoardDto => {
    if (ref !== undefined) return kanban.find(desktopId, ref)
    const boards = kanban.list(desktopId)
    if (boards.length === 1) return boards[0]!
    throw new AppError(boards.length === 0 ? 'There are no boards. Call board_create.' : 'There are several boards; say which one. Call board_list.')
  }

  const columnOf = (desktopId: Id, column: number | string, boardRef?: number | string): Id => {
    if (typeof column === 'number') {
      mine(desktopId, kanban.desktopOfColumn(column))
      return column
    }
    const board = boardOrOnly(desktopId, boardRef)
    const hit = board.columns.find((c) => c.name.toLowerCase() === column.trim().toLowerCase())
    if (!hit) throw new AppError(`Board "${board.name}" has no column "${column}". Columns: ${board.columns.map((c) => c.name).join(', ') || '(none)'}.`)
    return hit.id
  }

  return {
    board_list: async (_args, { desktopId }) => {
      const boards = kanban.list(desktopId)
      return textResult(
        boards.length === 0
          ? 'No boards.'
          : boards.map((b) => `[${b.id}] ${b.name}: ${b.columns.map((c) => `${c.name} (${c.cards.length})`).join(', ') || 'no columns'}`).join('\n')
      )
    },

    board_get: ({ board }, { desktopId }) => attempt(() => shown(boardOrOnly(desktopId, board))),

    board_create: ({ name, columns }, { desktopId }) => attempt(() => shown(kanban.createBoard(desktopId, name, columns))),

    board_rename: ({ board, name }, { desktopId }) => attempt(() => shown(kanban.renameBoard(kanban.find(desktopId, board).id, name))),

    board_delete: ({ board }, { desktopId }) =>
      attempt(() => {
        const found = kanban.find(desktopId, board)
        kanban.deleteBoard(found.id)
        return textResult(`Deleted board [${found.id}] ${found.name}.`)
      }),

    board_add_column: ({ board, name }, { desktopId }) => attempt(() => shown(kanban.addColumn(kanban.find(desktopId, board).id, name))),

    board_rename_column: ({ column, name }, { desktopId }) =>
      attempt(() => {
        mine(desktopId, kanban.desktopOfColumn(column))
        return shown(kanban.renameColumn(column, name))
      }),

    board_delete_column: ({ column }, { desktopId }) =>
      attempt(() => {
        mine(desktopId, kanban.desktopOfColumn(column))
        return shown(kanban.deleteColumn(column))
      }),

    board_add_card: ({ column, board, title, description, assignee }, { desktopId, sessionId }) =>
      attempt(() => shown(kanban.addCard(columnOf(desktopId, column, board), { title, description, assignee }, sessionId))),

    board_update_card: ({ card, title, description, assignee }, { desktopId, sessionId }) =>
      attempt(() => {
        mine(desktopId, kanban.desktopOfCard(card))
        return shown(kanban.updateCard(card, { title, description, assignee }, sessionId))
      }),

    board_move_card: ({ card, column, position }, { desktopId, sessionId }) =>
      attempt(() => {
        mine(desktopId, kanban.desktopOfCard(card))
        return shown(kanban.moveCard(card, columnOf(desktopId, column, kanban.boardOfCard(card)), position, sessionId))
      }),

    board_delete_card: ({ card }, { desktopId, sessionId }) =>
      attempt(() => {
        mine(desktopId, kanban.desktopOfCard(card))
        return shown(kanban.deleteCard(card, sessionId))
      })
  }
}
