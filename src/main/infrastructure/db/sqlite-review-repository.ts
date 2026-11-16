import type { Id } from '@shared/models'
import type { ReviewAuthor, ReviewCommentDto, ReviewCommentState, ReviewSeverity, ReviewSide, ReviewSummaryDto, ReviewVerdict } from '@shared/review'
import type { NewReviewCommentRow, ReviewRepository } from '../../domain/repositories/review-repository'
import { NOW_SQL, prepare, transaction, type Database, type Statement } from './sql'

interface CommentRow {
  id: number
  session_id: number
  path: string
  line_start: number
  line_end: number
  side: ReviewSide
  body: string
  severity: ReviewSeverity
  state: ReviewCommentState
  author: ReviewAuthor
  parent_id: number | null
  created_at: string
}

interface SummaryRow {
  session_id: number
  verdict: ReviewVerdict
  body: string
  created_at: string
}

const COLUMNS = 'id, session_id, path, line_start, line_end, side, body, severity, state, author, parent_id, created_at'

const toComment = (row: CommentRow): ReviewCommentDto => ({
  id: row.id,
  sessionId: row.session_id,
  path: row.path,
  lineStart: row.line_start,
  lineEnd: row.line_end,
  side: row.side,
  body: row.body,
  severity: row.severity,
  state: row.state,
  author: row.author,
  parentId: row.parent_id,
  createdAt: row.created_at
})

const toSummary = (row: SummaryRow): ReviewSummaryDto => ({ sessionId: row.session_id, verdict: row.verdict, body: row.body, createdAt: row.created_at })

export class SqliteReviewRepository implements ReviewRepository {
  private readonly selectBySession: Statement<[Id], CommentRow>
  private readonly selectById: Statement<[Id], CommentRow>
  private readonly insertComment: Statement<[Id, string, number, number, string, string, string, string, Id | null]>
  private readonly updateState: Statement<[string, Id]>
  private readonly updateStateOfSession: Statement<[string, Id, Id]>
  private readonly deleteComment: Statement<[Id]>
  private readonly selectSummary: Statement<[Id], SummaryRow>
  private readonly upsertSummary: Statement<[Id, string, string]>

  constructor(private readonly db: Database) {
    this.selectBySession = prepare(db, `SELECT ${COLUMNS} FROM review_comments WHERE session_id = ? ORDER BY id`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM review_comments WHERE id = ?`)
    this.insertComment = prepare(
      db,
      'INSERT INTO review_comments (session_id, path, line_start, line_end, side, body, severity, author, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    this.updateState = prepare(db, 'UPDATE review_comments SET state = ? WHERE id = ?')
    this.updateStateOfSession = prepare(db, 'UPDATE review_comments SET state = ? WHERE id = ? AND session_id = ?')
    this.deleteComment = prepare(db, 'DELETE FROM review_comments WHERE id = ?')
    this.selectSummary = prepare(db, 'SELECT session_id, verdict, body, created_at FROM review_summaries WHERE session_id = ?')
    this.upsertSummary = prepare(
      db,
      `INSERT INTO review_summaries (session_id, verdict, body) VALUES (?, ?, ?)
       ON CONFLICT (session_id) DO UPDATE SET verdict = excluded.verdict, body = excluded.body, created_at = ${NOW_SQL}`
    )
  }

  listComments(sessionId: Id): ReviewCommentDto[] {
    return this.selectBySession.all(sessionId).map(toComment)
  }

  getComment(id: Id): ReviewCommentDto | null {
    const row = this.selectById.get(id)
    return row ? toComment(row) : null
  }

  addComment(input: NewReviewCommentRow): ReviewCommentDto {
    const id = Number(
      this.insertComment.run(input.sessionId, input.path, input.lineStart, input.lineEnd, input.side, input.body, input.severity, input.author, input.parentId).lastInsertRowid
    )
    const comment = this.getComment(id)
    if (!comment) throw new Error(`Review comment ${id} vanished after insert`)
    return comment
  }

  setState(id: Id, state: ReviewCommentState): boolean {
    return this.updateState.run(state, id).changes > 0
  }

  setStates(sessionId: Id, ids: readonly Id[], state: ReviewCommentState): number {
    return transaction(this.db, () => ids.reduce((n, id) => n + Number(this.updateStateOfSession.run(state, id, sessionId).changes), 0))
  }

  removeComment(id: Id): boolean {
    return this.deleteComment.run(id).changes > 0
  }

  getSummary(sessionId: Id): ReviewSummaryDto | null {
    const row = this.selectSummary.get(sessionId)
    return row ? toSummary(row) : null
  }

  setSummary(sessionId: Id, verdict: ReviewVerdict, body: string): ReviewSummaryDto {
    this.upsertSummary.run(sessionId, verdict, body)
    const summary = this.getSummary(sessionId)
    if (!summary) throw new Error(`Review summary of session ${sessionId} vanished after insert`)
    return summary
  }
}
