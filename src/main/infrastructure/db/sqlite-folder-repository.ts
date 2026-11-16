import type { Database, Statement } from 'better-sqlite3'
import type { FolderDto, Id } from '@shared/models'
import type { FolderRepository } from '../../domain/repositories/folder-repository'
import { NOW_SQL } from './sql'

interface FolderRow {
  id: number
  name: string
  path: string
  last_opened_at: string | null
}

const COLUMNS = 'id, name, path, last_opened_at'

function toDto(row: FolderRow): FolderDto {
  return { id: row.id, name: row.name, path: row.path, lastOpenedAt: row.last_opened_at }
}

export class SqliteFolderRepository implements FolderRepository {
  private readonly selectAll: Statement<[], FolderRow>
  private readonly selectById: Statement<[Id], FolderRow>
  private readonly selectByPath: Statement<[string], FolderRow>
  private readonly insertFolder: Statement<[string, string]>
  private readonly touchFolder: Statement<[Id]>
  private readonly deleteFolder: Statement<[Id]>

  constructor(db: Database) {
    this.selectAll = db.prepare(
      `SELECT ${COLUMNS} FROM folders ORDER BY last_opened_at IS NULL, last_opened_at DESC, name COLLATE NOCASE, id`
    )
    this.selectById = db.prepare(`SELECT ${COLUMNS} FROM folders WHERE id = ?`)
    this.selectByPath = db.prepare(`SELECT ${COLUMNS} FROM folders WHERE path = ?`)
    this.insertFolder = db.prepare('INSERT INTO folders (path, name) VALUES (?, ?) ON CONFLICT (path) DO NOTHING')
    this.touchFolder = db.prepare(`UPDATE folders SET last_opened_at = ${NOW_SQL} WHERE id = ?`)
    this.deleteFolder = db.prepare('DELETE FROM folders WHERE id = ?')
  }

  list(): FolderDto[] {
    return this.selectAll.all().map(toDto)
  }

  get(id: Id): FolderDto | null {
    const row = this.selectById.get(id)
    return row ? toDto(row) : null
  }

  getByPath(path: string): FolderDto | null {
    const row = this.selectByPath.get(path)
    return row ? toDto(row) : null
  }

  add(path: string, name: string): FolderDto {
    this.insertFolder.run(path, name)
    const folder = this.getByPath(path)
    if (!folder) throw new Error(`Folder ${path} vanished after insert`)
    return folder
  }

  touch(id: Id): void {
    this.touchFolder.run(id)
  }

  remove(id: Id): boolean {
    return this.deleteFolder.run(id).changes > 0
  }
}
