import { describe, expect, it } from 'vitest'
import type { ReviewChangeDto, ReviewCommentDto, ReviewStateDto } from '@shared/review'
import { commentCounts, fileView, neighbourFile, openCounts, placeThreads, selectForSend, splitAnchor, unifiedAnchor } from './reviewModel'

const comment = (over: Partial<ReviewCommentDto>): ReviewCommentDto => ({
  id: 1,
  sessionId: 9,
  path: 'a.ts',
  lineStart: 2,
  lineEnd: 2,
  side: 'new',
  body: 'Fix',
  severity: 'minor',
  state: 'open',
  author: 'agent',
  parentId: null,
  createdAt: '2026-11-16T09:00:00.000Z',
  ...over
})

const file = { path: 'a.ts', status: 'modified' as const, oldText: 'one\ntwo\nthree\n', newText: 'one\nTWO\nthree\nfour\n', binary: false }

describe('fileView', () => {
  it('builds the unified rows, margin blocks and F7 regions', () => {
    const view = fileView(file, 'unified')
    expect(view.lines.map((l) => l.kind)).toEqual(['context', 'del', 'add', 'context', 'add'])
    expect(view.blocks.map((b) => b.kind)).toEqual(['del', 'add', 'add'])
    expect(view.regions).toEqual([{ start: 1, end: 2 }, { start: 4, end: 4 }])
    expect(view.split).toEqual([])
  })

  it('pairs removed with added lines side by side', () => {
    const view = fileView(file, 'split')
    expect(view.kinds).toEqual(['context', 'both', 'context', 'add'])
    expect(view.regions).toEqual([{ start: 1, end: 1 }, { start: 3, end: 3 }])
  })

  it('has no rows for a binary or too large file', () => {
    expect(fileView({ ...file, binary: true }, 'unified').lines).toEqual([])
    expect(fileView({ ...file, tooLarge: true }, 'unified').regions).toEqual([])
    expect(fileView(null, 'split').blocks).toEqual([])
  })
})

describe('anchors', () => {
  const view = fileView(file, 'unified')
  const split = fileView(file, 'split')

  it('puts a comment under the row of its last line on its side', () => {
    expect(unifiedAnchor(view.lines, { side: 'new', lineEnd: 2 })).toBe(2) // TWO
    expect(unifiedAnchor(view.lines, { side: 'old', lineEnd: 2 })).toBe(1) // two
    expect(splitAnchor(split.split, { side: 'new', lineEnd: 2 })).toBe(1)
    expect(splitAnchor(split.split, { side: 'old', lineEnd: 2 })).toBe(1)
    expect(unifiedAnchor(view.lines, { side: 'new', lineEnd: 99 })).toBe(-1)
  })

  it('keeps comments on lines that left the diff as orphans', () => {
    const threads = [
      { root: comment({ id: 1, lineEnd: 2 }), replies: [] },
      { root: comment({ id: 2, lineEnd: 99 }), replies: [] }
    ]
    const placed = placeThreads(threads, (c) => unifiedAnchor(view.lines, c))
    expect([...placed.byRow.keys()]).toEqual([2])
    expect(placed.orphans.map((t) => t.root.id)).toEqual([2])
  })
})

describe('selectForSend', () => {
  const state: ReviewStateDto = {
    comments: [
      comment({ id: 1, body: 'A', severity: 'blocker' }),
      comment({ id: 2, body: 'B', state: 'resolved' }),
      comment({ id: 3, body: 'C', lineStart: 7, lineEnd: 7 }),
      comment({ id: 4, parentId: 1, author: 'user', body: 'reply to A' }),
      comment({ id: 5, body: 'D', state: 'sent' })
    ],
    summary: { sessionId: 9, verdict: 'comment', body: 'ok', createdAt: '2026-11-16T09:00:00.000Z' }
  }

  it('"open" sends the open thread roots (and marks their replies sent too)', () => {
    const sel = selectForSend(state, 'open', 'HEAD')
    expect(sel.ids.sort()).toEqual([1, 3, 4])
    expect(sel.text).toContain('a.ts:2 [blocker] A')
    expect(sel.text).toContain('a.ts:7 [minor] C')
    expect(sel.text).toContain('You: reply to A')
    expect(sel.text).not.toContain(' B')
    expect(sel.text).toContain('Review verdict: Commented. ok')
  })

  it('sends exactly the chosen comments, whatever their state', () => {
    expect(selectForSend(state, [2], 'HEAD').ids).toEqual([2])
    expect(selectForSend(state, [], 'HEAD')).toEqual({ text: '', ids: [] })
    expect(selectForSend({ comments: [], summary: null }, 'open')).toEqual({ text: '', ids: [] })
  })
})

describe('lists', () => {
  const changes: ReviewChangeDto[] = ['a.ts', 'b.ts', 'c.ts'].map((path) => ({ path, status: 'modified', additions: 1, deletions: 0, binary: false }))

  it('finds the neighbour file with wrap-around', () => {
    expect(neighbourFile(changes, 'a.ts', 1)).toBe('b.ts')
    expect(neighbourFile(changes, 'c.ts', 1)).toBe('a.ts')
    expect(neighbourFile(changes, 'a.ts', -1)).toBe('c.ts')
    expect(neighbourFile(changes.slice(0, 1), 'a.ts', 1)).toBeNull()
  })

  it('counts open comments per file and roots per state', () => {
    const all = [comment({ id: 1 }), comment({ id: 2, path: 'b.ts', state: 'resolved' }), comment({ id: 3, parentId: 1 }), comment({ id: 4, state: 'sent' })]
    expect(Object.fromEntries(openCounts(all))).toEqual({ 'a.ts': 2 })
    expect(commentCounts(all)).toEqual({ open: 1, resolved: 1, sent: 1, total: 3 })
  })
})
