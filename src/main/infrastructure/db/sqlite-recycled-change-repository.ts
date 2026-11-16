import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { NewRecycledChange, RecycledChangeRecord, RecycledChangeRepository } from '../../domain/repositories/recycled-change-repository'
import { prepare, type Database, type Statement } from './sql'
import { driveLetterSql, toStoredVPath } from './sql-vpath'

interface Row {
  id: number
  desktop_id: number
  session_id: number | null
  folder_id: number | null
  path: string
  drive: string | null
  reverted_text: string | null
  restored_text: string | null
  reverted_at: string
}

const COLUMNS = `r.id, r.desktop_id, r.session_id, r.folder_id, r.path, r.reverted_text, r.restored_text, r.reverted_at,
  ${driveLetterSql('r.folder_id', 'r.desktop_id')} AS drive`

const toDto = (row: Row): RecycledChangeDto => ({
  id: row.id,
  desktopId: row.desktop_id,
  sessionId: row.session_id,
  path: toStoredVPath(row.drive, row.path),
  revertedText: row.reverted_text,
  restoredText: row.restored_text,
  revertedAt: row.reverted_at
})

export class SqliteRecycledChangeRepository implements RecycledChangeRepository {
  private readonly selectByDesktop: Statement<[Id], Row>
  private readonly selectById: Statement<[Id], Row>
  private readonly insert: Statement<[Id, Id | null, Id | null, string, string | null, string | null]>
  private readonly delete_: Statement<[Id]>
  private readonly deleteAll: Statement<[Id]>

  constructor(db: Database) {
    this.selectByDesktop = prepare(db, `SELECT ${COLUMNS} FROM recycled_changes r WHERE r.desktop_id = ? ORDER BY r.id DESC`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM recycled_changes r WHERE r.id = ?`)
    this.insert = prepare(db, 'INSERT INTO recycled_changes (desktop_id, session_id, folder_id, path, reverted_text, restored_text) VALUES (?, ?, ?, ?, ?, ?)')
    this.delete_ = prepare(db, 'DELETE FROM recycled_changes WHERE id = ?')
    this.deleteAll = prepare(db, 'DELETE FROM recycled_changes WHERE desktop_id = ?')
  }

  list(desktopId: Id): RecycledChangeDto[] {
    return this.selectByDesktop.all(desktopId).map(toDto)
  }

  get(id: Id): RecycledChangeRecord | null {
    const row = this.selectById.get(id)
    return row ? { ...toDto(row), folderId: row.folder_id, relativePath: row.path } : null
  }

  add(input: NewRecycledChange): RecycledChangeDto {
    const id = Number(this.insert.run(input.desktopId, input.sessionId, input.folderId, input.path, input.revertedText, input.restoredText).lastInsertRowid)
    return this.get(id)!
  }

  remove(id: Id): boolean {
    return this.delete_.run(id).changes > 0
  }

  removeAll(desktopId: Id): number {
    return this.deleteAll.run(desktopId).changes
  }
}
