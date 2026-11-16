import type { Bounds, OpenedBy, StickyColor, StickyNoteDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { NewStickyNote, StickyNotePatch, StickyNoteRepository } from '../../domain/repositories/sticky-note-repository'
import { prepare, type Database, type Statement } from './sql'

interface NoteRow {
  id: number
  desktop_id: number
  text: string
  color: StickyColor
  x: number
  y: number
  width: number
  height: number
  plan_session_id: number | null
  author: OpenedBy
}

const COLUMNS = 'id, desktop_id, text, color, x, y, width, height, plan_session_id, author'

const toDto = (row: NoteRow): StickyNoteDto => ({
  id: row.id,
  desktopId: row.desktop_id,
  text: row.text,
  color: row.color,
  bounds: { x: row.x, y: row.y, width: row.width, height: row.height },
  planSessionId: row.plan_session_id,
  author: row.author
})

const rounded = (b: Bounds): Bounds => ({ x: Math.round(b.x), y: Math.round(b.y), width: Math.max(1, Math.round(b.width)), height: Math.max(1, Math.round(b.height)) })

export class SqliteStickyNoteRepository implements StickyNoteRepository {
  private readonly selectByDesktop: Statement<[Id], NoteRow>
  private readonly selectById: Statement<[Id], NoteRow>
  private readonly insert: Statement<[Id, string, string, number, number, number, number, Id | null, string]>
  private readonly updateAll: Statement<[string, string, number, number, number, number, Id | null, Id]>
  private readonly delete_: Statement<[Id]>

  constructor(db: Database) {
    this.selectByDesktop = prepare(db, `SELECT ${COLUMNS} FROM sticky_notes WHERE desktop_id = ? ORDER BY id`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM sticky_notes WHERE id = ?`)
    this.insert = prepare(
      db,
      'INSERT INTO sticky_notes (desktop_id, text, color, x, y, width, height, plan_session_id, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    this.updateAll = prepare(
      db,
      'UPDATE sticky_notes SET text = ?, color = ?, x = ?, y = ?, width = ?, height = ?, plan_session_id = ? WHERE id = ?'
    )
    this.delete_ = prepare(db, 'DELETE FROM sticky_notes WHERE id = ?')
  }

  list(desktopId: Id): StickyNoteDto[] {
    return this.selectByDesktop.all(desktopId).map(toDto)
  }

  get(id: Id): StickyNoteDto | null {
    const row = this.selectById.get(id)
    return row ? toDto(row) : null
  }

  create(input: NewStickyNote): StickyNoteDto {
    const b = rounded(input.bounds)
    const id = Number(this.insert.run(input.desktopId, input.text, input.color, b.x, b.y, b.width, b.height, input.planSessionId, input.author).lastInsertRowid)
    return this.get(id)!
  }

  update(id: Id, patch: StickyNotePatch): StickyNoteDto | null {
    const current = this.get(id)
    if (!current) return null
    const b = rounded(patch.bounds ?? current.bounds)
    const planSessionId = patch.planSessionId === undefined ? current.planSessionId : patch.planSessionId
    this.updateAll.run(patch.text ?? current.text, patch.color ?? current.color, b.x, b.y, b.width, b.height, planSessionId, id)
    return this.get(id)
  }

  remove(id: Id): boolean {
    return this.delete_.run(id).changes > 0
  }
}
