import type { Id } from '@shared/models'
import type { ReviewAuthor, ReviewCommentDto, ReviewCommentState, ReviewSeverity, ReviewSide, ReviewSummaryDto, ReviewVerdict } from '@shared/review'

export interface NewReviewCommentRow {
  sessionId: Id
  path: string
  lineStart: number
  lineEnd: number
  side: ReviewSide
  body: string
  severity: ReviewSeverity
  author: ReviewAuthor
  parentId: Id | null
}

/** The comments and verdict of review sessions. */
export interface ReviewRepository {
  /** Oldest first. */
  listComments(sessionId: Id): ReviewCommentDto[]
  getComment(id: Id): ReviewCommentDto | null
  addComment(input: NewReviewCommentRow): ReviewCommentDto
  setState(id: Id, state: ReviewCommentState): boolean
  /** Marks these comments of the session (and no others) with `state`. */
  setStates(sessionId: Id, ids: readonly Id[], state: ReviewCommentState): number
  /** Deletes a comment and (by cascade) its replies. */
  removeComment(id: Id): boolean
  getSummary(sessionId: Id): ReviewSummaryDto | null
  /** The verdict of the session; submitting again replaces it. */
  setSummary(sessionId: Id, verdict: ReviewVerdict, body: string): ReviewSummaryDto
}
