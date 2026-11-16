/**
 * Code Review: the contract shared by main and renderer. A review is one ACP session (role `review`) that owns a
 * Code Review window; the agent reviews the working tree against a base ref and leaves comments like a merge request
 * gets them; the user can answer, resolve, delete and send them to a chat to fix. See docs/DESKTOP_DESIGN.md.
 *
 * Pure types, constants and pure functions only (the WinDiff block model lives in `windiff.ts`).
 */
import type { Id, IsoDate } from './models'
import type { VPath } from './vfs'

export const REVIEW_SEVERITIES = ['blocker', 'major', 'minor', 'nit'] as const
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number]

export const REVIEW_STATES = ['open', 'resolved', 'sent'] as const
export type ReviewCommentState = (typeof REVIEW_STATES)[number]

export const REVIEW_VERDICTS = ['approve', 'request_changes', 'comment'] as const
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number]

export type ReviewSide = 'old' | 'new'
export type ReviewAuthor = 'agent' | 'user'

export const VERDICT_LABELS: Record<ReviewVerdict, string> = {
  approve: 'Approved',
  request_changes: 'Changes requested',
  comment: 'Commented'
}

export const SEVERITY_LABELS: Record<ReviewSeverity, string> = {
  blocker: 'Blocker',
  major: 'Major',
  minor: 'Minor',
  nit: 'Nit'
}

/** The base ref of a new review: what the working tree is compared with. */
export const DEFAULT_BASE_REF = 'HEAD'

/** True for a ref that is safe to hand to git (no option injection, no whitespace). */
export const isSafeRef = (ref: string): boolean => /^[A-Za-z0-9_][A-Za-z0-9._/~^@{}:-]*$/.test(ref) && !ref.includes('..') && ref.length <= 200

export type ReviewChangeStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'

/** One changed file of the review (a row of the outline). `path` is relative to the review root, with `/`. */
export interface ReviewChangeDto {
  path: string
  /** The old path of a rename. */
  oldPath?: string
  status: ReviewChangeStatus
  additions: number
  deletions: number
  binary: boolean
}

/** Both sides of one changed file: the text at the base ref and the working file. */
export interface ReviewFileDto {
  path: string
  oldPath?: string
  status: ReviewChangeStatus
  oldText: string
  newText: string
  binary: boolean
  /** The file was too large and its text is left out. */
  tooLarge?: boolean
}

export interface ReviewCommentDto {
  id: Id
  sessionId: Id
  /** Relative to the review root, with `/`. */
  path: string
  /** 1-based line range on `side` (`lineEnd >= lineStart`). */
  lineStart: number
  lineEnd: number
  side: ReviewSide
  body: string
  severity: ReviewSeverity
  state: ReviewCommentState
  author: ReviewAuthor
  /** The comment this one answers (a reply), or null for a thread's first comment. */
  parentId: Id | null
  createdAt: IsoDate
}

export interface ReviewSummaryDto {
  sessionId: Id
  verdict: ReviewVerdict
  body: string
  createdAt: IsoDate
}

export interface ReviewStateDto {
  comments: ReviewCommentDto[]
  summary: ReviewSummaryDto | null
}

export interface NewReviewComment {
  path: string
  lineStart: number
  lineEnd?: number
  side?: ReviewSide
  body: string
  severity?: ReviewSeverity
  parentId?: Id | null
}

export interface ReviewApi {
  /** The changed files of the working tree at `root` against `baseRef` (tracked changes plus untracked files). [] outside a repository. */
  changes(desktopId: Id, root: VPath, baseRef: string): Promise<ReviewChangeDto[]>
  /** Both sides of one changed file. */
  file(desktopId: Id, root: VPath, baseRef: string, path: string): Promise<ReviewFileDto>
  /** The comments and the verdict of a review session. */
  state(sessionId: Id): Promise<ReviewStateDto>
  /** A comment (or, with `parentId`, a reply) by the user. */
  addComment(sessionId: Id, input: NewReviewComment): Promise<ReviewCommentDto>
  setState(commentId: Id, state: ReviewCommentState): Promise<void>
  remove(commentId: Id): Promise<void>
  /** Marks comments `sent` after they were passed to a chat. */
  markSent(sessionId: Id, commentIds: Id[]): Promise<void>
}

export interface ReviewEvents {
  /** Comments or the verdict of a review changed (the agent called a `review_*` tool, or the user edited). */
  'review.changed': { desktopId: Id; sessionId: Id }
}

// ---------------------------------------------------------------- pure helpers

const SEVERITY_ORDER: Record<ReviewSeverity, number> = { blocker: 0, major: 1, minor: 2, nit: 3 }

/** Blockers first, then by file and line: the order comments are listed and sent in. */
export function sortComments<T extends Pick<ReviewCommentDto, 'severity' | 'path' | 'lineStart' | 'id'>>(comments: readonly T[]): T[] {
  return [...comments].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.path.localeCompare(b.path) || a.lineStart - b.lineStart || a.id - b.id
  )
}

/** `src/a.ts:12` or `src/a.ts:12-14` (old side: `src/a.ts:12 (before the change)`). */
export function commentLocation(c: Pick<ReviewCommentDto, 'path' | 'lineStart' | 'lineEnd' | 'side'>): string {
  const range = c.lineEnd > c.lineStart ? `${c.lineStart}-${c.lineEnd}` : String(c.lineStart)
  return `${c.path}:${range}${c.side === 'old' ? ' (before the change)' : ''}`
}

/** The comments a "Send to chat" would pass on: the thread roots that are still open, plus their open replies. */
export const openComments = (comments: readonly ReviewCommentDto[]): ReviewCommentDto[] => comments.filter((c) => c.state === 'open')

/**
 * The prompt a chat gets to fix review comments: the verdict, then one entry per comment (path:line, severity, body,
 * replies indented below it).
 */
export function formatReviewPrompt(input: { comments: readonly ReviewCommentDto[]; summary: ReviewSummaryDto | null; all: readonly ReviewCommentDto[]; baseRef?: string }): string {
  const { comments, summary, all } = input
  const lines: string[] = ['Please fix the following code review comments.']
  if (summary) lines.push('', `Review verdict: ${VERDICT_LABELS[summary.verdict]}${summary.body.trim() ? `. ${summary.body.trim()}` : ''}`)
  if (input.baseRef) lines.push(`(Reviewed against ${input.baseRef}.)`)
  lines.push('')
  sortComments(comments).forEach((c, i) => {
    lines.push(`${i + 1}. ${commentLocation(c)} [${c.severity}] ${c.body.trim()}`)
    for (const reply of all.filter((r) => r.parentId === c.id)) lines.push(`   - ${reply.author === 'user' ? 'You' : 'Reviewer'}: ${reply.body.trim()}`)
  })
  lines.push('', 'Fix each one, then tell me what you changed.')
  return lines.join('\n')
}

/** Review comments of one file, replies grouped under their thread root. */
export function threadsOf(comments: readonly ReviewCommentDto[], path: string): { root: ReviewCommentDto; replies: ReviewCommentDto[] }[] {
  const ofFile = comments.filter((c) => c.path === path)
  return ofFile
    .filter((c) => c.parentId === null || !ofFile.some((p) => p.id === c.parentId))
    .sort((a, b) => a.lineStart - b.lineStart || a.id - b.id)
    .map((root) => ({ root, replies: ofFile.filter((r) => r.parentId === root.id).sort((a, b) => a.id - b.id) }))
}

/** The first prompt of a review: sent by the Code Review window when it opens with an empty transcript. */
export function reviewKickoffPrompt(root: string, baseRef: string): string {
  return (
    `Please do a code review of the changes in ${root} against ${baseRef}, like a merge-request reviewer. ` +
    'Call review_list_changes, read each file with review_read_diff, leave inline comments with review_add_comment ' +
    '(path, line, severity blocker/major/minor/nit, and a body that says what is wrong and why), ' +
    'then finish with review_submit (verdict approve, request_changes or comment, and a short summary). ' +
    'Review only; do not edit files.'
  )
}

/** True when two virtual paths belong to the same project: equal, or one inside the other (case-insensitive, `\` or `/`). */
export function sameProject(a: string, b: string): boolean {
  const norm = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  const [x, y] = [norm(a), norm(b)]
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)
}

/**
 * What a chat that did the review itself (not the review session of the window) reads after `review_submit`: the verdict
 * and the comments, so that it tells the user in the chat they asked from. Replies are left out.
 */
export function formatReviewHandback(summary: Pick<ReviewSummaryDto, 'verdict' | 'body'>, comments: readonly ReviewCommentDto[]): string {
  const roots = sortComments(comments.filter((c) => c.parentId === null))
  const lines = [`Review submitted in the Code Review window: ${VERDICT_LABELS[summary.verdict]}${summary.body.trim() ? `. ${summary.body.trim()}` : ''}`]
  lines.push(roots.length === 0 ? 'No inline comments.' : `${roots.length} inline comment${roots.length === 1 ? '' : 's'} (they are in the Code Review window):`)
  roots.forEach((c, i) => lines.push(`${i + 1}. ${commentLocation(c)} [${c.severity}] ${c.body.trim()}`))
  lines.push('Now tell the user the verdict and a short summary of these comments here in the chat, and offer to fix them.')
  return lines.join('\n')
}
