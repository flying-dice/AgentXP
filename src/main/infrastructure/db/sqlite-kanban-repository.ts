import type { BoardDto, CardDto, CardPatch, ColumnDto } from '@shared/kanban'
import type { Id } from '@shared/models'
import type { KanbanRepository } from '../../domain/repositories/kanban-repository'
import { prepare, transaction, type Database, type Statement } from './sql'

interface BoardRow { id: number; desktop_id: number; name: string }
interface ColumnRow { id: number; board_id: number; name: string }
interface CardRow { id: number; column_id: number; title: string; description: string; assignee: string | null }

const cardDto = (r: CardRow): CardDto => ({ id: r.id, columnId: r.column_id, title: r.title, description: r.description, assignee: r.assignee })

export class SqliteKanbanRepository implements KanbanRepository {
  private readonly selBoards: Statement<[Id], BoardRow>
  private readonly selBoard: Statement<[Id], BoardRow>
  private readonly selColumns: Statement<[Id], ColumnRow>
  private readonly selCards: Statement<[Id], CardRow>
  private readonly selCard: Statement<[Id], CardRow>
  private readonly selColumnBoard: Statement<[Id], { board_id: number }>
  private readonly selCardBoard: Statement<[Id], { board_id: number }>
  private readonly insBoard: Statement<[Id, string]>
  private readonly updBoard: Statement<[string, Id]>
  private readonly delBoard: Statement<[Id]>
  private readonly insColumn: Statement<[Id, string, Id]>
  private readonly updColumn: Statement<[string, Id]>
  private readonly delColumn: Statement<[Id]>
  private readonly posColumn: Statement<[number, Id]>
  private readonly insCard: Statement<[Id, string, string, string | null, Id]>
  private readonly updCard: Statement<[string, string, string | null, Id]>
  private readonly delCard: Statement<[Id]>
  private readonly posCard: Statement<[Id, number, Id]>
  private readonly countColumns: Statement<[Id], { n: number }>
  private readonly countCards: Statement<[Id], { n: number }>

  constructor(private readonly db: Database) {
    this.selBoards = prepare(db, 'SELECT id, desktop_id, name FROM kanban_boards WHERE desktop_id = ? ORDER BY id')
    this.selBoard = prepare(db, 'SELECT id, desktop_id, name FROM kanban_boards WHERE id = ?')
    this.selColumns = prepare(db, 'SELECT id, board_id, name FROM kanban_columns WHERE board_id = ? ORDER BY position, id')
    this.selCards = prepare(db, 'SELECT id, column_id, title, description, assignee FROM kanban_cards WHERE column_id = ? ORDER BY position, id')
    this.selCard = prepare(db, 'SELECT id, column_id, title, description, assignee FROM kanban_cards WHERE id = ?')
    this.selColumnBoard = prepare(db, 'SELECT board_id FROM kanban_columns WHERE id = ?')
    this.selCardBoard = prepare(db, 'SELECT c.board_id AS board_id FROM kanban_cards k JOIN kanban_columns c ON c.id = k.column_id WHERE k.id = ?')
    this.insBoard = prepare(db, 'INSERT INTO kanban_boards (desktop_id, name) VALUES (?, ?)')
    this.updBoard = prepare(db, 'UPDATE kanban_boards SET name = ? WHERE id = ?')
    this.delBoard = prepare(db, 'DELETE FROM kanban_boards WHERE id = ?')
    this.insColumn = prepare(db, 'INSERT INTO kanban_columns (board_id, name, position) VALUES (?, ?, ?)')
    this.updColumn = prepare(db, 'UPDATE kanban_columns SET name = ? WHERE id = ?')
    this.delColumn = prepare(db, 'DELETE FROM kanban_columns WHERE id = ?')
    this.posColumn = prepare(db, 'UPDATE kanban_columns SET position = ? WHERE id = ?')
    this.insCard = prepare(db, 'INSERT INTO kanban_cards (column_id, title, description, assignee, position) VALUES (?, ?, ?, ?, ?)')
    this.updCard = prepare(db, 'UPDATE kanban_cards SET title = ?, description = ?, assignee = ? WHERE id = ?')
    this.delCard = prepare(db, 'DELETE FROM kanban_cards WHERE id = ?')
    this.posCard = prepare(db, 'UPDATE kanban_cards SET column_id = ?, position = ? WHERE id = ?')
    this.countColumns = prepare(db, 'SELECT COUNT(*) AS n FROM kanban_columns WHERE board_id = ?')
    this.countCards = prepare(db, 'SELECT COUNT(*) AS n FROM kanban_cards WHERE column_id = ?')
  }

  boards(desktopId: Id): BoardDto[] {
    return this.selBoards.all(desktopId).map((b) => this.load(b))
  }

  board(id: Id): BoardDto | null {
    const row = this.selBoard.get(id)
    return row ? this.load(row) : null
  }

  boardOfColumn(columnId: Id): Id | null {
    return this.selColumnBoard.get(columnId)?.board_id ?? null
  }

  boardOfCard(cardId: Id): Id | null {
    return this.selCardBoard.get(cardId)?.board_id ?? null
  }

  desktopOfBoard(id: Id): Id | null {
    return this.selBoard.get(id)?.desktop_id ?? null
  }

  createBoard(desktopId: Id, name: string): Id {
    return Number(this.insBoard.run(desktopId, name).lastInsertRowid)
  }

  renameBoard(id: Id, name: string): void {
    this.updBoard.run(name, id)
  }

  deleteBoard(id: Id): void {
    this.delBoard.run(id)
  }

  createColumn(boardId: Id, name: string): Id {
    return Number(this.insColumn.run(boardId, name, this.countColumns.get(boardId)!.n).lastInsertRowid)
  }

  renameColumn(id: Id, name: string): void {
    this.updColumn.run(name, id)
  }

  deleteColumn(id: Id): void {
    this.delColumn.run(id)
  }

  orderColumns(boardId: Id, ids: readonly Id[]): void {
    void boardId
    transaction(this.db, () => ids.forEach((id, i) => this.posColumn.run(i, id)))
  }

  createCard(columnId: Id, card: { title: string; description: string; assignee: string | null }): Id {
    return Number(this.insCard.run(columnId, card.title, card.description, card.assignee, this.countCards.get(columnId)!.n).lastInsertRowid)
  }

  card(id: Id): CardDto | null {
    const row = this.selCard.get(id)
    return row ? cardDto(row) : null
  }

  updateCard(id: Id, patch: CardPatch): void {
    const current = this.selCard.get(id)
    if (!current) return
    const assignee = patch.assignee === undefined ? current.assignee : patch.assignee
    this.updCard.run(patch.title ?? current.title, patch.description ?? current.description, assignee, id)
  }

  deleteCard(id: Id): void {
    this.delCard.run(id)
  }

  orderCards(columnId: Id, ids: readonly Id[]): void {
    transaction(this.db, () => ids.forEach((id, i) => this.posCard.run(columnId, i, id)))
  }

  private load(b: BoardRow): BoardDto {
    const columns: ColumnDto[] = this.selColumns.all(b.id).map((c) => ({ id: c.id, boardId: c.board_id, name: c.name, cards: this.selCards.all(c.id).map(cardDto) }))
    return { id: b.id, desktopId: b.desktop_id, name: b.name, columns }
  }
}
