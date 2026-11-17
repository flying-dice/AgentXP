/** In-memory Kanban boards for Storybook and tests (the KanbanApi of the fake backend). */
import { DEFAULT_COLUMNS, reorder, type BoardDto, type KanbanApi, type KanbanEvents } from '@shared/kanban'
import type { Id } from '@shared/models'

type Emit = <K extends keyof KanbanEvents>(event: K, payload: KanbanEvents[K]) => void

export const sampleBoards: BoardDto[] = [
  {
    id: 1,
    desktopId: 1,
    name: 'Team board',
    columns: [
      {
        id: 1,
        boardId: 1,
        name: 'To do',
        cards: [
          { id: 1, columnId: 1, title: 'Fix the login redirect', description: 'Keep the ?next= parameter when the session expired.\nAdd a test for parseRedirect.', assignee: 'Claude Code' },
          { id: 2, columnId: 1, title: 'Write the release notes', description: '', assignee: null }
        ]
      },
      { id: 2, boardId: 1, name: 'Doing', cards: [{ id: 3, columnId: 2, title: 'Review the pull request', description: 'Check the new auth flow.', assignee: 'Me' }] },
      { id: 3, boardId: 1, name: 'Done', cards: [{ id: 4, columnId: 3, title: 'Plug in the project', description: '', assignee: 'Me' }] }
    ]
  }
]

export function createFakeKanban(emit: Emit, initial: BoardDto[] = sampleBoards): KanbanApi {
  let boards: BoardDto[] = structuredClone(initial)
  let next = 1000
  const changed = (b: BoardDto): BoardDto => {
    emit('kanban.changed', { desktopId: b.desktopId })
    return structuredClone(b)
  }
  const boardOf = (id: Id): BoardDto => boards.find((b) => b.id === id)!
  const columnOf = (id: Id) => boards.flatMap((b) => b.columns).find((c) => c.id === id)!
  const cardColumn = (id: Id) => boards.flatMap((b) => b.columns).find((c) => c.cards.some((k) => k.id === id))!

  return {
    list: async (desktopId) => structuredClone(boards.filter((b) => b.desktopId === desktopId)),
    createBoard: async (desktopId, name) => {
      const id = next++
      const board: BoardDto = { id, desktopId, name, columns: DEFAULT_COLUMNS.map((c) => ({ id: next++, boardId: id, name: c, cards: [] })) }
      boards = [...boards, board]
      return changed(board)
    },
    renameBoard: async (id, name) => changed(Object.assign(boardOf(id), { name })),
    deleteBoard: async (id) => {
      const board = boardOf(id)
      boards = boards.filter((b) => b.id !== id)
      emit('kanban.changed', { desktopId: board.desktopId })
    },
    addColumn: async (boardId, name) => {
      const board = boardOf(boardId)
      board.columns.push({ id: next++, boardId, name, cards: [] })
      return changed(board)
    },
    renameColumn: async (id, name) => {
      const col = columnOf(id)
      col.name = name
      return changed(boardOf(col.boardId))
    },
    moveColumn: async (id, index) => {
      const board = boardOf(columnOf(id).boardId)
      const order = reorder(board.columns.map((c) => c.id), id, index)
      board.columns = order.map((i) => board.columns.find((c) => c.id === i)!)
      return changed(board)
    },
    deleteColumn: async (id) => {
      const board = boardOf(columnOf(id).boardId)
      board.columns = board.columns.filter((c) => c.id !== id)
      return changed(board)
    },
    addCard: async (columnId, card) => {
      const col = columnOf(columnId)
      col.cards.push({ id: next++, columnId, title: card.title, description: card.description ?? '', assignee: card.assignee ?? null })
      return changed(boardOf(col.boardId))
    },
    updateCard: async (id, patch) => {
      const col = cardColumn(id)
      Object.assign(col.cards.find((k) => k.id === id)!, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
      return changed(boardOf(col.boardId))
    },
    moveCard: async (id, columnId, index) => {
      const from = cardColumn(id)
      const to = columnOf(columnId)
      const card = from.cards.find((k) => k.id === id)!
      from.cards = from.cards.filter((k) => k.id !== id)
      const order = reorder(to.cards.map((k) => k.id), id, index)
      to.cards = order.map((i) => (i === id ? { ...card, columnId } : to.cards.find((k) => k.id === i)!))
      return changed(boardOf(to.boardId))
    },
    deleteCard: async (id) => {
      const col = cardColumn(id)
      col.cards = col.cards.filter((k) => k.id !== id)
      return changed(boardOf(col.boardId))
    }
  }
}
