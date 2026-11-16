import { prepare, transaction, type Database, type Statement } from './sql'
import type { FileChangeDto, FileChangeKind, Id } from '@shared/models'
import { countLineChanges } from '@shared/diff'
import type { FileChangeRecord, FileChangeRepository, FileWrite } from '../../domain/repositories/file-change-repository'
import { NOW_SQL } from './sql'
import { driveLetterSql, toStoredVPath } from './sql-vpath'

interface FileChangeRow {
  id: number
  session_id: number
  folder_id: number | null
  path: string
  drive: string | null
  kind: FileChangeKind
  original_text: string | null
  current_text: string | null
  additions: number
  deletions: number
}

const COLUMNS = `c.id, c.session_id, c.folder_id, c.path, c.kind, c.original_text, c.current_text, c.additions, c.deletions,
  ${driveLetterSql('c.folder_id', '(SELECT s.desktop_id FROM sessions s WHERE s.id = c.session_id)')} AS drive`

function toDto(row: FileChangeRow): FileChangeDto {
  return {
    id: row.id,
    sessionId: row.session_id,
    path: toStoredVPath(row.drive, row.path),
    kind: row.kind,
    additions: row.additions,
    deletions: row.deletions,
    originalText: row.original_text,
    currentText: row.current_text
  }
}

function classify(original: string | null, current: string | null): FileChangeKind {
  if (original === null) return 'added'
  return current === null ? 'deleted' : 'modified'
}

interface Computed {
  kind: FileChangeKind
  additions: number
  deletions: number
}

function compute(original: string | null, current: string | null): Computed {
  return { kind: classify(original, current), ...countLineChanges(original, current) }
}

function isNoOp(original: string | null, current: string | null): boolean {
  return original === current
}

export class SqliteFileChangeRepository implements FileChangeRepository {
  private readonly selectBySession: Statement<[Id], FileChangeRow>
  private readonly selectById: Statement<[Id], FileChangeRow>
  private readonly selectByPath: Statement<[Id, Id, string], FileChangeRow>
  private readonly insertChange: Statement<[Id, Id | null, string, string, string | null, string | null, number, number]>
  private readonly updateChange: Statement<[string, string | null, number, number, Id]>
  private readonly deleteChange: Statement<[Id]>

  constructor(private readonly db: Database) {
    this.selectBySession = prepare(db, `SELECT ${COLUMNS} FROM file_changes c WHERE c.session_id = ? ORDER BY c.path`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM file_changes c WHERE c.id = ?`)
    this.selectByPath = prepare(db, `SELECT ${COLUMNS} FROM file_changes c WHERE c.session_id = ? AND COALESCE(c.folder_id, 0) = ? AND c.path = ?`)
    this.insertChange = prepare(db, 
      `INSERT INTO file_changes (session_id, folder_id, path, kind, original_text, current_text, additions, deletions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.updateChange = prepare(db, 
      `UPDATE file_changes SET kind = ?, current_text = ?, additions = ?, deletions = ?, updated_at = ${NOW_SQL}
       WHERE id = ?`
    )
    this.deleteChange = prepare(db, 'DELETE FROM file_changes WHERE id = ?')
  }

  list(sessionId: Id): FileChangeDto[] {
    return this.selectBySession.all(sessionId).map(toDto)
  }

  get(id: Id): FileChangeRecord | null {
    const row = this.selectById.get(id)
    return row ? { ...toDto(row), folderId: row.folder_id, relativePath: row.path } : null
  }

  record(write: FileWrite): FileChangeDto | null {
    return transaction(this.db, () => {
      const existing = this.selectByPath.get(write.sessionId, write.folderId ?? 0, write.path)
      return existing ? this.accumulate(existing, write) : this.start(write)
    })
  }

  remove(id: Id): boolean {
    return this.deleteChange.run(id).changes > 0
  }

  private start(write: FileWrite): FileChangeDto | null {
    if (isNoOp(write.previousText, write.newText)) return null
    const c = compute(write.previousText, write.newText)
    const id = Number(
      this.insertChange.run(write.sessionId, write.folderId, write.path, c.kind, write.previousText, write.newText, c.additions, c.deletions)
        .lastInsertRowid
    )
    return this.get(id)
  }

  private accumulate(existing: FileChangeRow, write: FileWrite): FileChangeDto | null {
    if (isNoOp(existing.original_text, write.newText)) {
      this.deleteChange.run(existing.id)
      return null
    }
    const c = compute(existing.original_text, write.newText)
    this.updateChange.run(c.kind, write.newText, c.additions, c.deletions, existing.id)
    return this.get(existing.id)
  }
}
