import { DEFAULT_COLUMNS, MAX_KANBAN_TEXT, reorder, type BoardDto, type CardInput, type CardPatch } from '@shared/kanban'
import type { Id } from '@shared/models'
import type { KanbanRepository } from '../../domain/repositories/kanban-repository'
import { AppError, required } from '../errors'
import type { EventPublisher } from '../ports'

export interface KanbanServiceDeps {
  kanban: KanbanRepository
  events: EventPublisher
}

const name = (value: string, what: string): string => {
  const trimmed = value.trim()
  if (!trimmed) throw new AppError(`${what} needs a name`)
  if (trimmed.length > 200) throw new AppError(`${what} name is too long`)
  return trimmed
}

const text = (value: string, what: string): string => {
  if (value.length > MAX_KANBAN_TEXT) throw new AppError(`A ${what} holds at most ${MAX_KANBAN_TEXT} characters`)
  return value
}

const assignee = (value: string | null | undefined): string | null | undefined => (typeof value === 'string' ? value.trim() || null : value)

/** Boards, columns and cards of a desktop. Every change publishes `kanban.changed`; each call answers with the changed board. */
export class KanbanService {
  constructor(private readonly deps: KanbanServiceDeps) {}

  list(desktopId: Id): BoardDto[] {
    return this.deps.kanban.boards(desktopId)
  }

  board(id: Id): BoardDto {
    return required(this.deps.kanban.board(id), 'Board')
  }

  /** The board with this id, or the one with this name (case-insensitive) on the desktop. */
  find(desktopId: Id, ref: number | string): BoardDto {
    const boards = this.list(desktopId)
    const hit = typeof ref === 'number' ? boards.find((b) => b.id === ref) : boards.find((b) => b.name.toLowerCase() === ref.trim().toLowerCase())
    if (!hit) throw new AppError(`Board ${ref} does not exist on this desktop. Call board_list.`)
    return hit
  }

  /** The board the card or column id belongs to must live on `desktopId` (agents only touch their own desktop's boards). */
  desktopOfCard(cardId: Id): Id {
    return this.desktopOfBoard(required(this.deps.kanban.boardOfCard(cardId), 'Card'))
  }

  desktopOfColumn(columnId: Id): Id {
    return this.desktopOfBoard(required(this.deps.kanban.boardOfColumn(columnId), 'Column'))
  }

  boardOfCard(cardId: Id): Id {
    return required(this.deps.kanban.boardOfCard(cardId), 'Card')
  }

  desktopOfBoard(boardId: Id): Id {
    return required(this.deps.kanban.desktopOfBoard(boardId), 'Board')
  }

  createBoard(desktopId: Id, boardName: string, columns: readonly string[] = DEFAULT_COLUMNS): BoardDto {
    const id = this.deps.kanban.createBoard(desktopId, name(boardName, 'A board'))
    for (const column of columns) this.deps.kanban.createColumn(id, name(column, 'A column'))
    return this.done(id)
  }

  renameBoard(id: Id, boardName: string): BoardDto {
    required(this.deps.kanban.board(id), 'Board')
    this.deps.kanban.renameBoard(id, name(boardName, 'A board'))
    return this.done(id)
  }

  deleteBoard(id: Id): void {
    const desktopId = this.desktopOfBoard(id)
    this.deps.kanban.deleteBoard(id)
    this.deps.events.publish('kanban.changed', { desktopId })
  }

  addColumn(boardId: Id, columnName: string): BoardDto {
    required(this.deps.kanban.board(boardId), 'Board')
    this.deps.kanban.createColumn(boardId, name(columnName, 'A column'))
    return this.done(boardId)
  }

  renameColumn(id: Id, columnName: string): BoardDto {
    const boardId = required(this.deps.kanban.boardOfColumn(id), 'Column')
    this.deps.kanban.renameColumn(id, name(columnName, 'A column'))
    return this.done(boardId)
  }

  moveColumn(id: Id, index: number): BoardDto {
    const boardId = required(this.deps.kanban.boardOfColumn(id), 'Column')
    const ids = this.board(boardId).columns.map((c) => c.id)
    this.deps.kanban.orderColumns(boardId, reorder(ids, id, index))
    return this.done(boardId)
  }

  deleteColumn(id: Id): BoardDto {
    const boardId = required(this.deps.kanban.boardOfColumn(id), 'Column')
    this.deps.kanban.deleteColumn(id)
    return this.done(boardId)
  }

  addCard(columnId: Id, card: CardInput): BoardDto {
    const boardId = required(this.deps.kanban.boardOfColumn(columnId), 'Column')
    this.deps.kanban.createCard(columnId, {
      title: name(card.title, 'A card'),
      description: text(card.description ?? '', 'description'),
      assignee: assignee(card.assignee) ?? null
    })
    return this.done(boardId)
  }

  updateCard(id: Id, patch: CardPatch): BoardDto {
    const boardId = required(this.deps.kanban.boardOfCard(id), 'Card')
    this.deps.kanban.updateCard(id, {
      title: patch.title === undefined ? undefined : name(patch.title, 'A card'),
      description: patch.description === undefined ? undefined : text(patch.description, 'description'),
      assignee: assignee(patch.assignee)
    })
    return this.done(boardId)
  }

  moveCard(id: Id, columnId: Id, index?: number): BoardDto {
    const boardId = required(this.deps.kanban.boardOfCard(id), 'Card')
    const target = this.board(boardId).columns.find((c) => c.id === columnId)
    if (!target) throw new AppError('A card moves between the columns of its own board')
    const source = this.board(boardId).columns.find((c) => c.cards.some((k) => k.id === id))!
    if (source.id !== columnId) this.deps.kanban.orderCards(source.id, source.cards.filter((k) => k.id !== id).map((k) => k.id))
    const ids = target.cards.map((k) => k.id)
    this.deps.kanban.orderCards(columnId, reorder(ids, id, index))
    return this.done(boardId)
  }

  deleteCard(id: Id): BoardDto {
    const boardId = required(this.deps.kanban.boardOfCard(id), 'Card')
    this.deps.kanban.deleteCard(id)
    return this.done(boardId)
  }

  private done(boardId: Id): BoardDto {
    const board = this.board(boardId)
    this.deps.events.publish('kanban.changed', { desktopId: board.desktopId })
    return board
  }
}
