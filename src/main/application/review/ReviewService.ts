import { diffStats, computeDiff } from '@shared/diff'
import type { DesktopState } from '@shared/desktop'
import type { Id } from '@shared/models'
import {
  isSafeRef,
  type NewReviewComment,
  type ReviewChangeDto,
  type ReviewChangeStatus,
  type ReviewCommentDto,
  type ReviewCommentState,
  type ReviewFileDto,
  type ReviewStateDto,
  type ReviewSummaryDto,
  type ReviewVerdict
} from '@shared/review'
import { joinVPath, type VPath } from '@shared/vfs'
import type { ReviewRepository } from '../../domain/repositories/review-repository'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import { AppError, required } from '../errors'
import type { GitCli } from '../git/ports'
import type { EventPublisher } from '../ports'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'

export interface ReviewServiceDeps {
  reviews: ReviewRepository
  sessions: Pick<SessionRepository, 'get'>
  vfs: Pick<VirtualFileSystem, 'realPath' | 'readFile'>
  cli: GitCli
  events: EventPublisher
  /** The live desktop (the review tools find the window of their session in it). */
  states: { state(desktopId: Id): DesktopState }
}

/** Files above this size are listed but their text is left out. */
export const MAX_REVIEW_FILE_BYTES = 1_000_000
const MAX_REVIEW_FILES = 500
const CONCURRENCY = 8

const STATUS_BY_LETTER: Record<string, ReviewChangeStatus> = { M: 'modified', A: 'added', D: 'deleted', R: 'renamed', C: 'added', T: 'modified' }

/** The parsed `git diff --name-status -z` output: `M\0path\0`, `R100\0old\0new\0`. */
export function parseNameStatus(out: string): { status: ReviewChangeStatus; path: string; oldPath?: string }[] {
  const tokens = out.split('\0')
  const entries: { status: ReviewChangeStatus; path: string; oldPath?: string }[] = []
  for (let i = 0; i < tokens.length; i++) {
    const code = tokens[i]
    if (!code) continue
    const letter = code[0]
    const status = STATUS_BY_LETTER[letter]
    if (!status) continue
    if (letter === 'R' || letter === 'C') {
      const oldPath = tokens[i + 1]
      const path = tokens[i + 2]
      i += 2
      if (path) entries.push({ status, path, ...(letter === 'R' ? { oldPath } : {}) })
    } else {
      const path = tokens[i + 1]
      i += 1
      if (path) entries.push({ status, path })
    }
  }
  return entries
}

const lines = (out: string): string[] => out.split('\0').filter(Boolean)

/** A path relative to the review root: no drive, no `..`, no leading slash. Returns its segments. */
function segmentsOf(path: string): string[] {
  const segments = path.split('/').filter((s) => s !== '' && s !== '.')
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || segments.length === 0 || segments.includes('..')) throw new AppError(`Not a path inside the review: ${path}`)
  return segments
}

/**
 * Code Review: the changed files of a working tree (git CLI, read only), the comments and the verdict of a review
 * session. A review session (role `review`) owns its Code Review window; the `review_*` tools only work for it.
 */
export class ReviewService {
  constructor(private readonly deps: ReviewServiceDeps) {}

  // ---- diff --------------------------------------------------------------------------------------

  async changes(desktopId: Id, root: VPath, baseRef: string): Promise<ReviewChangeDto[]> {
    const real = await this.repoDir(desktopId, root)
    if (real === null) return []
    const entries = await this.entries(real, baseRef)
    const result: ReviewChangeDto[] = []
    for (let i = 0; i < entries.length; i += CONCURRENCY) {
      result.push(...(await Promise.all(entries.slice(i, i + CONCURRENCY).map((e) => this.describe(desktopId, root, real, baseRef, e)))))
    }
    return result.sort((a, b) => a.path.localeCompare(b.path))
  }

  async file(desktopId: Id, root: VPath, baseRef: string, path: string): Promise<ReviewFileDto> {
    const real = await this.repoDir(desktopId, root)
    if (real === null) throw new AppError('The review folder is not in a git repository.')
    const entry = (await this.entries(real, baseRef)).find((e) => e.path === path)
    if (!entry) throw new AppError(`${path} has no changes against ${baseRef}.`)
    const [oldText, newText] = await this.texts(desktopId, root, real, baseRef, entry)
    const binary = (oldText ?? '').includes('\0') || (newText ?? '').includes('\0')
    const tooLarge = oldText === null || newText === null
    return {
      path,
      ...(entry.oldPath ? { oldPath: entry.oldPath } : {}),
      status: entry.status,
      oldText: binary ? '' : (oldText ?? ''),
      newText: binary ? '' : (newText ?? ''),
      binary,
      ...(tooLarge ? { tooLarge: true } : {})
    }
  }

  // ---- comments ----------------------------------------------------------------------------------

  state(sessionId: Id): ReviewStateDto {
    return { comments: this.deps.reviews.listComments(sessionId), summary: this.deps.reviews.getSummary(sessionId) }
  }

  addComment(sessionId: Id, input: NewReviewComment, author: 'agent' | 'user'): ReviewCommentDto {
    this.requireReviewSession(sessionId)
    const body = input.body.trim()
    if (!body) throw new AppError('A comment needs text.')
    segmentsOf(input.path)
    const lineStart = Math.max(1, Math.floor(input.lineStart))
    const lineEnd = Math.max(lineStart, Math.floor(input.lineEnd ?? lineStart))
    const parent = input.parentId == null ? null : required(this.deps.reviews.getComment(input.parentId), 'Comment')
    if (parent && parent.sessionId !== sessionId) throw new AppError('That comment belongs to another review.')
    const comment = this.deps.reviews.addComment({
      sessionId,
      path: input.path,
      lineStart,
      lineEnd,
      side: input.side ?? 'new',
      body,
      severity: input.severity ?? 'minor',
      author,
      parentId: parent ? (parent.parentId ?? parent.id) : null
    })
    this.changed(sessionId)
    return comment
  }

  setState(commentId: Id, state: ReviewCommentState): void {
    const comment = required(this.deps.reviews.getComment(commentId), 'Comment')
    this.deps.reviews.setState(commentId, state)
    this.changed(comment.sessionId)
  }

  remove(commentId: Id): void {
    const comment = required(this.deps.reviews.getComment(commentId), 'Comment')
    this.deps.reviews.removeComment(commentId)
    this.changed(comment.sessionId)
  }

  markSent(sessionId: Id, ids: Id[]): void {
    this.requireReviewSession(sessionId)
    this.deps.reviews.setStates(sessionId, ids, 'sent')
    this.changed(sessionId)
  }

  submit(sessionId: Id, verdict: ReviewVerdict, body: string): ReviewSummaryDto {
    this.requireReviewSession(sessionId)
    const summary = this.deps.reviews.setSummary(sessionId, verdict, body.trim())
    this.changed(sessionId)
    return summary
  }

  // ---- ownership ---------------------------------------------------------------------------------

  /** True when the session is a review session that owns an open Code Review window on its desktop. */
  ownsWindow(sessionId: Id): boolean {
    return this.windowOf(sessionId) !== null
  }

  /**
   * The Code Review window of the session (`root`, `baseRef`), or a readable error. This is what scopes the
   * `review_*` tools: any other session (a chat on the same desktop, another review) is refused.
   */
  requireWindow(sessionId: Id): { windowId: Id; desktopId: Id; root: VPath; baseRef: string } {
    const window = this.windowOf(sessionId)
    if (!window) throw new AppError('The review tools only work in the review session of a Code Review window. This session does not own one.')
    return window
  }

  private windowOf(sessionId: Id): { windowId: Id; desktopId: Id; root: VPath; baseRef: string } | null {
    const session = this.deps.sessions.get(sessionId)
    if (!session || session.role !== 'review' || session.desktopId == null) return null
    let state: DesktopState
    try {
      state = this.deps.states.state(session.desktopId)
    } catch {
      return null
    }
    for (const w of state.windows) {
      if (w.view.app === 'code-review' && w.view.sessionId === sessionId) return { windowId: w.id, desktopId: session.desktopId, root: w.view.root, baseRef: w.view.baseRef }
    }
    return null
  }

  private requireReviewSession(sessionId: Id): void {
    const session = required(this.deps.sessions.get(sessionId), 'Session')
    if (session.role !== 'review') throw new AppError('That session is not a review.')
  }

  private changed(sessionId: Id): void {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId != null) this.deps.events.publish('review.changed', { desktopId, sessionId })
  }

  // ---- git ---------------------------------------------------------------------------------------

  /** The real directory of `root` when it is inside a git work tree, else null (also for ejected drives). */
  private async repoDir(desktopId: Id, root: VPath): Promise<string | null> {
    let real: string
    try {
      real = await this.deps.vfs.realPath(desktopId, root)
    } catch {
      return null
    }
    const inside = await this.deps.cli.run(real, ['rev-parse', '--is-inside-work-tree'])
    return inside.ok && inside.stdout.trim() === 'true' ? real : null
  }

  private async entries(real: string, baseRef: string): Promise<{ status: ReviewChangeStatus; path: string; oldPath?: string }[]> {
    if (!isSafeRef(baseRef)) throw new AppError(`Not a valid git ref: ${baseRef}`)
    const verified = await this.deps.cli.run(real, ['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`])
    const tracked: { status: ReviewChangeStatus; path: string; oldPath?: string }[] = []
    if (verified.ok) {
      const diff = await this.deps.cli.run(real, ['diff', '--name-status', '-z', '--no-color', '--no-ext-diff', '--no-textconv', '--ignore-submodules', '--relative', baseRef, '--'])
      if (!diff.ok) throw new AppError(`git diff failed: ${diff.stderr.trim() || 'unknown error'}`)
      tracked.push(...parseNameStatus(diff.stdout))
    } else if (baseRef !== 'HEAD') {
      throw new AppError(`Unknown git ref: ${baseRef}`)
    } else {
      // No commit yet: everything in the index is new.
      const cached = await this.deps.cli.run(real, ['ls-files', '--cached', '-z'])
      for (const path of cached.ok ? lines(cached.stdout) : []) tracked.push({ status: 'added', path })
    }
    const others = await this.deps.cli.run(real, ['ls-files', '--others', '--exclude-standard', '-z'])
    const known = new Set(tracked.map((e) => e.path))
    const untracked = (others.ok ? lines(others.stdout) : []).filter((p) => !known.has(p)).map((path) => ({ status: 'untracked' as const, path }))
    return [...tracked, ...untracked].slice(0, MAX_REVIEW_FILES)
  }

  /** `[old, new]`; null for a side that is too large. */
  private async texts(
    desktopId: Id,
    root: VPath,
    real: string,
    baseRef: string,
    entry: { status: ReviewChangeStatus; path: string; oldPath?: string }
  ): Promise<[string | null, string | null]> {
    let oldText: string | null = ''
    if (entry.status !== 'added' && entry.status !== 'untracked') {
      const shown = await this.deps.cli.run(real, ['show', `${baseRef}:./${entry.oldPath ?? entry.path}`])
      oldText = shown.ok ? shown.stdout : ''
    } else if (entry.status === 'added') {
      // Staged new file: the base has nothing, unless this is a copy.
      oldText = ''
    }
    if (oldText !== null && oldText.length > MAX_REVIEW_FILE_BYTES) oldText = null
    let newText: string | null = ''
    if (entry.status !== 'deleted') {
      const target = joinVPath(root, ...segmentsOf(entry.path))
      try {
        if (!target) throw new AppError(`Not a path inside the review: ${entry.path}`)
        newText = await this.deps.vfs.readFile(desktopId, target)
      } catch {
        newText = ''
      }
      if (newText.length > MAX_REVIEW_FILE_BYTES) newText = null
    }
    return [oldText, newText]
  }

  private async describe(
    desktopId: Id,
    root: VPath,
    real: string,
    baseRef: string,
    entry: { status: ReviewChangeStatus; path: string; oldPath?: string }
  ): Promise<ReviewChangeDto> {
    const [oldText, newText] = await this.texts(desktopId, root, real, baseRef, entry)
    const binary = (oldText ?? '').includes('\0') || (newText ?? '').includes('\0')
    const stats = binary || oldText === null || newText === null ? { added: 0, removed: 0 } : diffStats(computeDiff(oldText, newText, 0))
    return { path: entry.path, ...(entry.oldPath ? { oldPath: entry.oldPath } : {}), status: entry.status, additions: stats.added, deletions: stats.removed, binary }
  }
}
