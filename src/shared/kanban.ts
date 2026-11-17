/**
 * The Kanban contract shared by main and renderer: boards of columns (lists) of cards, and the pure ordering logic.
 * A board belongs to a desktop; its id is stable, so anything else (a team, a chat room) can point at a board by id.
 *
 * Pure types and functions only.
 */
import type { Id } from './models'

export interface CardDto {
  id: Id
  columnId: Id
  title: string
  description: string
  /** Free text: a person or an agent profile name. Null when nobody is assigned. */
  assignee: string | null
}

export interface ColumnDto {
  id: Id
  boardId: Id
  name: string
  /** In order, top first. */
  cards: CardDto[]
}

export interface BoardDto {
  id: Id
  desktopId: Id
  name: string
  /** In order, left first. */
  columns: ColumnDto[]
}

export const DEFAULT_COLUMNS = ['To do', 'Doing', 'Done'] as const
export const MAX_KANBAN_TEXT = 20_000

export interface CardInput {
  title: string
  description?: string
  assignee?: string | null
}
export type CardPatch = Partial<Pick<CardDto, 'title' | 'description' | 'assignee'>>

export interface KanbanApi {
  list(desktopId: Id): Promise<BoardDto[]>
  createBoard(desktopId: Id, name: string): Promise<BoardDto>
  renameBoard(id: Id, name: string): Promise<BoardDto>
  deleteBoard(id: Id): Promise<void>
  addColumn(boardId: Id, name: string): Promise<BoardDto>
  renameColumn(id: Id, name: string): Promise<BoardDto>
  /** `index` is the new position among the board's columns. */
  moveColumn(id: Id, index: number): Promise<BoardDto>
  deleteColumn(id: Id): Promise<BoardDto>
  addCard(columnId: Id, card: CardInput): Promise<BoardDto>
  updateCard(id: Id, patch: CardPatch): Promise<BoardDto>
  /** Moves a card to a column (the same or another one) at `index` (default: the end). */
  moveCard(id: Id, columnId: Id, index?: number): Promise<BoardDto>
  deleteCard(id: Id): Promise<BoardDto>
}

export interface KanbanEvents {
  /** The boards of a desktop changed (anyone, user or agent); the window loads them again. */
  'kanban.changed': { desktopId: Id }
}

/** `ids` with `id` moved to `index` (clamped; default the end). Pure. */
export function reorder(ids: readonly Id[], id: Id, index?: number): Id[] {
  const rest = ids.filter((x) => x !== id)
  const at = index === undefined ? rest.length : Math.max(0, Math.min(rest.length, Math.trunc(index)))
  rest.splice(at, 0, id)
  return rest
}

/** The board as plain text for an agent: ids in brackets so it can address a column or a card. */
export function describeBoard(board: BoardDto): string {
  const lines = [`Board [${board.id}] ${board.name}`]
  if (board.columns.length === 0) lines.push('  (no columns)')
  for (const col of board.columns) {
    lines.push(`  Column [${col.id}] ${col.name} (${col.cards.length})`)
    for (const c of col.cards) {
      lines.push(`    Card [${c.id}] ${c.title}${c.assignee ? ` (assignee: ${c.assignee})` : ''}`)
      if (c.description) lines.push(...c.description.split('\n').map((l) => `      ${l}`))
    }
  }
  return lines.join('\n')
}
