import type { Database, Statement } from 'better-sqlite3'
import type { Id, TranscriptEntryDto } from '@shared/models'

export type EntryKind = TranscriptEntryDto['kind']

/** Allocates transcript entries (the supertype rows) with per-session sequence numbers. */
export class TranscriptEntries {
  private readonly insertEntry: Statement<[Id, Id, EntryKind]>
  private readonly deleteEntry: Statement<[Id]>
  private readonly deleteBySession: Statement<[Id]>

  constructor(db: Database) {
    this.insertEntry = db.prepare(
      `INSERT INTO transcript_entries (session_id, seq, kind)
       VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM transcript_entries WHERE session_id = ?), ?)`
    )
    this.deleteEntry = db.prepare('DELETE FROM transcript_entries WHERE id = ?')
    this.deleteBySession = db.prepare('DELETE FROM transcript_entries WHERE session_id = ?')
  }

  /** Must run inside the caller's transaction together with the subtype insert. */
  allocate(sessionId: Id, kind: EntryKind): Id {
    return Number(this.insertEntry.run(sessionId, sessionId, kind).lastInsertRowid)
  }

  delete(entryId: Id): void {
    this.deleteEntry.run(entryId)
  }

  deleteAll(sessionId: Id): void {
    this.deleteBySession.run(sessionId)
  }
}
