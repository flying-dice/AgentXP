/**
 * In-memory Code Review for Storybook and tests: the changed files are the files whose HEAD differs from the fake
 * file system (`fakeGit`), the comments are kept per review session and start with a reviewer's two comments, a
 * reply and a verdict (`seed`).
 */
import type { Id } from '@shared/models'
import type { VfsApi } from '@shared/vfs'
import { computeDiff, diffStats } from '@shared/diff'
import type { NewReviewComment, ReviewApi, ReviewChangeDto, ReviewCommentDto, ReviewEvents, ReviewStateDto } from '@shared/review'

type Emit = <K extends keyof ReviewEvents>(event: K, payload: ReviewEvents[K]) => void

const relOf = (vpath: string): string => vpath.replace(/^[A-Za-z]:\\/, '').replaceAll('\\', '/')
const vpathOf = (rel: string): string => `E:\\${rel.replaceAll('/', '\\')}`

export interface FakeReviewOptions {
  vfs: VfsApi
  /** HEAD text by VPath of the files that differ from the working tree. */
  head: Record<string, string>
  /** Extra untracked files (relative path -> text) next to the fake file system's. */
  untracked?: string[]
  emit: Emit
  /** Give every review session the sample comments and verdict. Default true. */
  seed?: boolean
}

const at = (minutes: number): string => new Date(Date.UTC(2026, 10, 16, 9, 30 - minutes, 12)).toISOString()

/** The sample review: two inline comments by the reviewer, the user's reply to the first, and a verdict. */
export function sampleReview(sessionId: Id): ReviewStateDto {
  const base = { sessionId, side: 'new' as const, state: 'open' as const, parentId: null, lineEnd: 0 }
  const comments: ReviewCommentDto[] = [
    { ...base, id: 1, path: 'src/auth/redirect.ts', lineStart: 5, lineEnd: 5, body: 'The redirect target is never validated. Anything that is not a path on this site must fall back to "/", or this is an open redirect.', severity: 'blocker', author: 'agent', createdAt: at(8) },
    { ...base, id: 2, path: 'src/index.ts', lineStart: 3, lineEnd: 3, body: 'This new log line prints the session token. Please log the session id instead.', severity: 'major', author: 'agent', createdAt: at(7) },
    { ...base, id: 3, path: 'src/auth/redirect.ts', lineStart: 5, lineEnd: 5, body: 'Good catch, I will add a test for "//evil.example" as well.', severity: 'minor', author: 'user', parentId: 1, createdAt: at(5) }
  ]
  return { comments, summary: { sessionId, verdict: 'request_changes', body: 'One blocker (open redirect) and one major issue (token in the log).', createdAt: at(6) } }
}

export function createFakeReview(options: FakeReviewOptions): ReviewApi {
  const states = new Map<Id, ReviewStateDto>()
  let nextId = 100
  const stateOf = (sessionId: Id): ReviewStateDto => {
    let state = states.get(sessionId)
    if (!state) states.set(sessionId, (state = options.seed === false ? { comments: [], summary: null } : sampleReview(sessionId)))
    return state
  }
  const changed = (sessionId: Id): void => options.emit('review.changed', { desktopId: 1, sessionId })

  const textOf = async (rel: string): Promise<string | null> => {
    try {
      return await options.vfs.readFile(1, vpathOf(rel))
    } catch {
      return null
    }
  }

  const entries = async (): Promise<{ path: string; status: ReviewChangeDto['status']; oldText: string; newText: string }[]> => {
    const list: { path: string; status: ReviewChangeDto['status']; oldText: string; newText: string }[] = []
    for (const [vpath, oldText] of Object.entries(options.head)) {
      const path = relOf(vpath)
      const newText = await textOf(path)
      list.push({ path, status: newText === null ? 'deleted' : 'modified', oldText, newText: newText ?? '' })
    }
    for (const path of options.untracked ?? ['src/auth/urls.ts']) {
      const newText = await textOf(path)
      if (newText !== null) list.push({ path, status: 'untracked', oldText: '', newText })
    }
    return list.sort((a, b) => a.path.localeCompare(b.path))
  }

  return {
    changes: async () => {
      const list = await entries()
      return list.map((e) => {
        const { added, removed } = diffStats(computeDiff(e.oldText, e.newText, 0))
        return { path: e.path, status: e.status, additions: added, deletions: removed, binary: false }
      })
    },
    file: async (_desktopId, _root, _baseRef, path) => {
      const found = (await entries()).find((e) => e.path === path)
      if (!found) throw new Error(`${path} has no changes against HEAD.`)
      return { path, status: found.status, oldText: found.oldText, newText: found.newText, binary: false }
    },
    state: async (sessionId) => structuredClone(stateOf(sessionId)),
    addComment: async (sessionId, input: NewReviewComment) => {
      const state = stateOf(sessionId)
      const parent = input.parentId == null ? null : state.comments.find((c) => c.id === input.parentId)
      const comment: ReviewCommentDto = {
        id: nextId++,
        sessionId,
        path: input.path,
        lineStart: input.lineStart,
        lineEnd: Math.max(input.lineStart, input.lineEnd ?? input.lineStart),
        side: input.side ?? 'new',
        body: input.body,
        severity: input.severity ?? 'minor',
        state: 'open',
        author: 'user',
        parentId: parent ? (parent.parentId ?? parent.id) : null,
        createdAt: new Date().toISOString()
      }
      state.comments = [...state.comments, comment]
      changed(sessionId)
      return comment
    },
    setState: async (commentId, next) => {
      for (const [sessionId, state] of states) {
        if (state.comments.some((c) => c.id === commentId)) {
          state.comments = state.comments.map((c) => (c.id === commentId ? { ...c, state: next } : c))
          changed(sessionId)
        }
      }
    },
    remove: async (commentId) => {
      for (const [sessionId, state] of states) {
        if (state.comments.some((c) => c.id === commentId)) {
          state.comments = state.comments.filter((c) => c.id !== commentId && c.parentId !== commentId)
          changed(sessionId)
        }
      }
    },
    markSent: async (sessionId, ids) => {
      const state = stateOf(sessionId)
      state.comments = state.comments.map((c) => (ids.includes(c.id) ? { ...c, state: 'sent' } : c))
      changed(sessionId)
    }
  }
}
