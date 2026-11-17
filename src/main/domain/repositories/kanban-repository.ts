import type { BoardDto, CardDto, CardPatch } from '@shared/kanban'
import type { Id } from '@shared/models'

/** Rows of a board; ordering is by `position`. The service decides the positions (it passes whole id lists to `order*`). */
export interface KanbanRepository {
  /** Boards of a desktop with their columns and cards, oldest board first. */
  boards(desktopId: Id): BoardDto[]
  board(id: Id): BoardDto | null
  boardOfColumn(columnId: Id): Id | null
  boardOfCard(cardId: Id): Id | null
  desktopOfBoard(id: Id): Id | null

  createBoard(desktopId: Id, name: string): Id
  renameBoard(id: Id, name: string): void
  deleteBoard(id: Id): void

  /** Appends at the end. */
  createColumn(boardId: Id, name: string): Id
  renameColumn(id: Id, name: string): void
  deleteColumn(id: Id): void
  /** Rewrites the positions of the board's columns to the order of `ids`. */
  orderColumns(boardId: Id, ids: readonly Id[]): void

  /** Appends at the end of the column. */
  createCard(columnId: Id, card: { title: string; description: string; assignee: string | null }): Id
  card(id: Id): CardDto | null
  updateCard(id: Id, patch: CardPatch): void
  deleteCard(id: Id): void
  /** Puts exactly the cards `ids` in the column in that order (a card of another column moves in). */
  orderCards(columnId: Id, ids: readonly Id[]): void
}
