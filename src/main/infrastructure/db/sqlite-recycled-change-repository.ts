import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { NewRecycledChange, RecycledChangeRepository } from '../../domain/repositories/recycled-change-repository'
import { prepare, type Database, type Statement } from './sql'

interface Row {
  id: number
  desktop_id: number
  session_id: number | null
  path: string
  reverted_text: string | null
  restored_text: string | null
  reverted_at: string
}

const COLUMNS = 'id, desktop_id, session_id, path, reverted_text, restored_text, reverted_at'

const toDto = (row: Row): RecycledChangeDto => ({
  id: row.id,
  desktopId: row.desktop_id,
  sessionId: row.session_id,
  path: row.path,
  revertedText: row.reverted_text,
  restoredText: row.restored_text,
  revertedAt: row.reverted_at
})

export class SqliteRecycledChangeRepository implements RecycledChangeRepository {
  private readonly selectByDesktop: Statement<[Id], Row>
  private readonly selectById: Statement<[Id], Row>
  private readonly insert: Statement<[Id, Id | null, string, string | null, string | null]>
  private readonly delete_: Statement<[Id]>
  private readonly deleteAll: Statement<[Id]>

  constructor(db: Database) {
    this.selectByDesktop = prepare(db, `SELECT ${COLUMNS} FROM recycled_changes WHERE desktop_id = ? ORDER BY id DESC`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM recycled_changes WHERE id = ?`)
    this.insert = prepare(db, 'INSERT INTO recycled_changes (desktop_id, session_id, path, reverted_text, restored_text) VALUES (?, ?, ?, ?, ?)')
    this.delete_ = prepare(db, 'DELETE FROM recycled_changes WHERE id = ?')
    this.deleteAll = prepare(db, 'DELETE FROM recycled_changes WHERE desktop_id = ?')
  }

  list(desktopId: Id): RecycledChangeDto[] {
    return this.selectByDesktop.all(desktopId).map(toDto)
  }

  get(id: Id): RecycledChangeDto | null {
    const row = this.selectById.get(id)
    return row ? toDto(row) : null
  }

  add(input: NewRecycledChange): RecycledChangeDto {
    const id = Number(this.insert.run(input.desktopId, input.sessionId, input.path, input.revertedText, input.restoredText).lastInsertRowid)
    return this.get(id)!
  }

  remove(id: Id): boolean {
    return this.delete_.run(id).changes > 0
  }

  removeAll(desktopId: Id): number {
    return this.deleteAll.run(desktopId).changes
  }
}
