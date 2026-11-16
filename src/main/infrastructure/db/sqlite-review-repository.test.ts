import { describe, expect, it } from 'vitest'
import { SqliteReviewRepository } from './sqlite-review-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { count, createFixture } from './test-helpers'

function setup() {
  const f = createFixture()
  const sessions = new SqliteSessionRepository(f.db)
  const review = sessions.create({ agentId: f.agentId, title: 'Review', role: 'review' })
  return { f, sessions, review, repo: new SqliteReviewRepository(f.db) }
}

const input = (sessionId: number, over: Record<string, unknown> = {}) => ({
  sessionId,
  path: 'src/a.ts',
  lineStart: 3,
  lineEnd: 3,
  side: 'new' as const,
  body: 'Fix this',
  severity: 'major' as const,
  author: 'agent' as const,
  parentId: null,
  ...over
})

describe('SqliteReviewRepository', () => {
  it('stores a session role (default chat)', () => {
    const { f, sessions, review } = setup()
    expect(sessions.get(f.sessionId)?.role).toBe('chat')
    expect(review.role).toBe('review')
    expect(sessions.create({ agentId: f.agentId, title: 'A', role: 'aside' }).role).toBe('aside')
  })

  it('adds comments (open by default), lists them oldest first and reads one back', () => {
    const { review, repo } = setup()
    const a = repo.addComment(input(review.id))
    const b = repo.addComment(input(review.id, { path: 'b.ts', side: 'old', author: 'user', severity: 'nit' }))
    expect(a).toMatchObject({ sessionId: review.id, path: 'src/a.ts', lineStart: 3, lineEnd: 3, side: 'new', body: 'Fix this', severity: 'major', state: 'open', author: 'agent', parentId: null })
    expect(a.createdAt).toMatch(/Z$/)
    expect(repo.listComments(review.id).map((c) => c.id)).toEqual([a.id, b.id])
    expect(repo.getComment(b.id)).toMatchObject({ side: 'old', author: 'user' })
    expect(repo.getComment(999)).toBeNull()
  })

  it('keeps comments of different sessions apart', () => {
    const { f, sessions, review, repo } = setup()
    const other = sessions.create({ agentId: f.agentId, title: 'Review 2', role: 'review' })
    repo.addComment(input(review.id))
    repo.addComment(input(other.id))
    expect(repo.listComments(review.id)).toHaveLength(1)
    expect(repo.listComments(other.id)).toHaveLength(1)
  })

  it('changes states, and setStates only touches comments of that session', () => {
    const { f, sessions, review, repo } = setup()
    const other = sessions.create({ agentId: f.agentId, title: 'Review 2', role: 'review' })
    const mine = repo.addComment(input(review.id))
    const theirs = repo.addComment(input(other.id))
    expect(repo.setState(mine.id, 'resolved')).toBe(true)
    expect(repo.getComment(mine.id)?.state).toBe('resolved')
    expect(repo.setState(999, 'resolved')).toBe(false)
    expect(repo.setStates(review.id, [mine.id, theirs.id], 'sent')).toBe(1)
    expect(repo.getComment(mine.id)?.state).toBe('sent')
    expect(repo.getComment(theirs.id)?.state).toBe('open')
  })

  it('replies point at the root and are deleted with it', () => {
    const { review, repo } = setup()
    const root = repo.addComment(input(review.id))
    const reply = repo.addComment(input(review.id, { parentId: root.id, author: 'user' }))
    expect(reply.parentId).toBe(root.id)
    expect(repo.removeComment(reply.id)).toBe(true)
    const again = repo.addComment(input(review.id, { parentId: root.id }))
    expect(repo.removeComment(root.id)).toBe(true)
    expect(repo.getComment(again.id)).toBeNull()
    expect(repo.removeComment(root.id)).toBe(false)
  })

  it('keeps one verdict per session; submitting again replaces it', () => {
    const { review, repo } = setup()
    expect(repo.getSummary(review.id)).toBeNull()
    expect(repo.setSummary(review.id, 'comment', 'first')).toMatchObject({ verdict: 'comment', body: 'first' })
    expect(repo.setSummary(review.id, 'approve', 'LGTM')).toMatchObject({ verdict: 'approve', body: 'LGTM', sessionId: review.id })
    expect(repo.getSummary(review.id)?.body).toBe('LGTM')
  })

  it('deleting the session removes its comments and verdict', () => {
    const { f, sessions, review, repo } = setup()
    repo.addComment(input(review.id))
    repo.setSummary(review.id, 'approve', '')
    sessions.remove(review.id)
    expect(count(f.db, 'review_comments')).toBe(0)
    expect(count(f.db, 'review_summaries')).toBe(0)
  })
})
