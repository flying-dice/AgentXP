import { describe, expect, it } from 'vitest'
import { commentLocation, formatReviewPrompt, isSafeRef, reviewKickoffPrompt, sortComments, threadsOf, type ReviewCommentDto, type ReviewSummaryDto } from './review'

const comment = (over: Partial<ReviewCommentDto>): ReviewCommentDto => ({
  id: 1,
  sessionId: 9,
  path: 'src/a.ts',
  lineStart: 4,
  lineEnd: 4,
  side: 'new',
  body: 'Fix this',
  severity: 'minor',
  state: 'open',
  author: 'agent',
  parentId: null,
  createdAt: '2026-11-16T09:00:00.000Z',
  ...over
})

describe('isSafeRef', () => {
  it('accepts branches, tags, commits and revision expressions', () => {
    for (const ref of ['HEAD', 'HEAD~2', 'main', 'origin/main', 'v1.2.3', 'a1b2c3d', 'HEAD^', 'feature/x-y_z']) expect(isSafeRef(ref)).toBe(true)
  })
  it('refuses options, ranges, whitespace and the empty string', () => {
    for (const ref of ['', '--output=x', '-p', 'a b', 'a..b', 'x;rm', '$(id)']) expect(isSafeRef(ref)).toBe(false)
  })
})

describe('comments', () => {
  it('describes a location, with the old side marked', () => {
    expect(commentLocation(comment({}))).toBe('src/a.ts:4')
    expect(commentLocation(comment({ lineStart: 4, lineEnd: 6 }))).toBe('src/a.ts:4-6')
    expect(commentLocation(comment({ side: 'old' }))).toBe('src/a.ts:4 (before the change)')
  })

  it('sorts blockers first, then by file and line', () => {
    const sorted = sortComments([
      comment({ id: 1, severity: 'nit', path: 'a.ts' }),
      comment({ id: 2, severity: 'blocker', path: 'z.ts', lineStart: 1 }),
      comment({ id: 3, severity: 'blocker', path: 'a.ts', lineStart: 9 }),
      comment({ id: 4, severity: 'blocker', path: 'a.ts', lineStart: 2 })
    ])
    expect(sorted.map((c) => c.id)).toEqual([4, 3, 2, 1])
  })

  it('groups replies under their thread root, per file', () => {
    const all = [comment({ id: 1, lineStart: 8 }), comment({ id: 2, lineStart: 2 }), comment({ id: 3, parentId: 1, author: 'user' }), comment({ id: 4, path: 'other.ts' })]
    const threads = threadsOf(all, 'src/a.ts')
    expect(threads.map((t) => t.root.id)).toEqual([2, 1])
    expect(threads[1].replies.map((r) => r.id)).toEqual([3])
  })
})

describe('formatReviewPrompt', () => {
  const summary: ReviewSummaryDto = { sessionId: 9, verdict: 'request_changes', body: 'Two problems.', createdAt: '2026-11-16T09:00:00.000Z' }

  it('lists path:line, severity and body of each comment, blockers first, with the verdict', () => {
    const all = [
      comment({ id: 1, body: 'Nit: rename', severity: 'nit', lineStart: 1, lineEnd: 1 }),
      comment({ id: 2, body: 'Validate the target', severity: 'blocker', path: 'src/auth/redirect.ts', lineStart: 5, lineEnd: 7 }),
      comment({ id: 3, parentId: 2, author: 'user', body: 'Will do' })
    ]
    const text = formatReviewPrompt({ comments: [all[0], all[1]], all, summary, baseRef: 'main' })
    expect(text).toContain('Review verdict: Changes requested. Two problems.')
    expect(text).toContain('(Reviewed against main.)')
    const lines = text.split('\n')
    expect(lines.indexOf('1. src/auth/redirect.ts:5-7 [blocker] Validate the target')).toBeGreaterThan(-1)
    expect(lines.indexOf('2. src/a.ts:1 [nit] Nit: rename')).toBeGreaterThan(lines.indexOf('1. src/auth/redirect.ts:5-7 [blocker] Validate the target'))
    expect(text).toContain('   - You: Will do')
  })

  it('leaves the verdict out when there is none', () => {
    expect(formatReviewPrompt({ comments: [comment({})], all: [comment({})], summary: null })).not.toContain('verdict')
  })

  it('has a kickoff prompt that names the tools and the base', () => {
    const text = reviewKickoffPrompt('E:\\', 'HEAD~1')
    for (const word of ['E:\\', 'HEAD~1', 'review_list_changes', 'review_read_diff', 'review_add_comment', 'review_submit']) expect(text).toContain(word)
    expect(text.toLowerCase()).toContain('code review')
  })
})
