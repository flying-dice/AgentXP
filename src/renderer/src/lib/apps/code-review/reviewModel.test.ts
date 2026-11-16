import { describe, expect, it } from 'vitest'
import type { ReviewChangeDto, ReviewCommentDto, ReviewStateDto } from '@shared/review'
import { fitStatusFields, SEVERITY_HELP, addCommentTitle, addCommentButtonTitle, chatChoiceLabel, NEW_CHAT_FOR_COMMENTS, baseLabel, filesStatusLabel, verdictLine, projectNameOf, changePosition, changePositionLabel, changeTotals, commentCounts, fileView, neighbourFile, openCounts, openingFile, placeThreads, selectForSend, splitAnchor, STATUS_LABEL, unifiedAnchor } from './reviewModel'

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

describe('opening file, change position and totals (UX-41, UX-42)', () => {
  const change = (path: string, additions = 1, deletions = 0): ReviewChangeDto => ({ path, status: 'modified', additions, deletions, binary: false })

  it('opens on the first file that has a comment, else the first file', () => {
    const changes = [change('a.ts'), change('b.ts'), change('c.ts')]
    expect(openingFile(changes, [comment({ path: 'c.ts' }), comment({ path: 'b.ts', id: 2 })])).toBe('b.ts')
    expect(openingFile(changes, [])).toBe('a.ts')
    expect(openingFile([], [])).toBeNull()
  })

  it('says which change the selected row is in', () => {
    const regions = [{ start: 1, end: 2 }, { start: 5, end: 5 }, { start: 9, end: 10 }]
    expect(changePosition(regions, null)).toEqual({ index: 0, total: 3 })
    expect(changePosition(regions, 2)).toEqual({ index: 1, total: 3 })
    expect(changePosition(regions, 7)).toEqual({ index: 2, total: 3 })
    expect(changePositionLabel(regions, 9)).toBe('Change 3 of 3')
    expect(changePositionLabel(regions, null)).toBe('3 changes')
    expect(changePositionLabel([], null)).toBe('')
  })

  it('totals the lines of the files and explains HEAD', () => {
    expect(changeTotals([change('a', 5, 1), { ...change('b', 7, 2), binary: true }, change('c', 2, 2)])).toBe('3 files, +7 -3')
    expect(changeTotals([change('a', 1, 0)])).toBe('1 file, +1 -0')
    expect(baseLabel('HEAD')).toBe('HEAD (the last saved version)')
    expect(baseLabel('main')).toBe('main')
    expect(STATUS_LABEL.untracked).toBe('New file')
  })

  it('finds the project of a path by the label of its drive', () => {
    const drives = [{ letter: 'C', label: 'Agent home' }, { letter: 'E', label: 'review-notes' }]
    expect(projectNameOf('E:\\', drives)).toBe('review-notes')
    expect(projectNameOf('E:\\src\\a.ts', drives)).toBe('review-notes')
    expect(projectNameOf('F:\\', drives)).toBeNull()
    expect(projectNameOf('nonsense', drives)).toBeNull()
  })
})

describe('numbers in digits (UX-77)', () => {
  it('writes the verdict sentence once, with the blockers in digits (the link says the comments, UX-191)', () => {
    const c = (severity: 'blocker' | 'minor', parentId: number | null = null) => ({ parentId, severity })
    expect(verdictLine('request_changes', [c('blocker'), c('minor'), c('minor', 1)])).toBe('Changes requested. 1 comment is a blocker.')
    expect(verdictLine('request_changes', [c('blocker'), c('blocker')])).toBe('Changes requested. 2 comments are blockers.')
    expect(verdictLine('request_changes', [c('minor')])).toBe('Changes requested.')
    expect(verdictLine('comment', [c('minor')])).toBe('Commented.')
    expect(verdictLine('approve', [])).toBe('Approved.')
  })
  it('says how many files changed and how many are shown', () => {
    expect(filesStatusLabel(2, 1)).toBe('Showing 1 of 2 changed files')
    expect(filesStatusLabel(2, 1, 'src\\auth/redirect.ts')).toBe('Showing redirect.ts (1 of 2 changed files)')
    expect(filesStatusLabel(1, 1, 'redirect.ts')).toBe('1 file changed')
    expect(filesStatusLabel(2, 0)).toBe('2 files changed')
    expect(filesStatusLabel(1, 1)).toBe('1 file changed')
    expect(filesStatusLabel(0, 0)).toBe('0 files changed')
  })
})

describe('adding a comment (UX-76)', () => {
  it('explains the default severity and the "+" of the gutter', () => {
    expect(SEVERITY_HELP).toContain('Minor is the usual choice')
    expect(addCommentTitle(2)).toBe('Add a comment on this line')
    expect(addCommentTitle(undefined)).toContain('no line')
  })
})

describe('the send dialog and the Add comment button (UX-122)', () => {
  it('names the open chat with its project folder and the other choice for what it does', () => {
    expect(chatChoiceLabel({ title: 'Fix the login', cwd: 'E:\\' }, 'review-notes')).toBe('Chat: Fix the login (in E:\\)')
    expect(chatChoiceLabel({ title: 'New session', cwd: 'E:\\' }, 'review-notes')).toBe('Chat: review-notes (in E:\\)')
    expect(chatChoiceLabel({ title: null, cwd: 'E:\\' })).toBe('Chat: New chat (in E:\\)')
    expect(NEW_CHAT_FOR_COMMENTS).toBe('Start a new chat for these comments')
  })
  it('says why Add comment is grey', () => {
    expect(addCommentButtonTitle(false, false)).toMatch(/Expanded/)
    expect(addCommentButtonTitle(true, false)).toMatch(/Select a line/)
    expect(addCommentButtonTitle(true, true)).toBe('Add a comment on the selected line')
  })
})

describe('fitStatusFields (UX-167)', () => {
  const fields = [
    { key: 'files', text: '2 files changed' },
    { key: 'comments', text: '0 open, 0 resolved, 2 sent' },
    { key: 'change', text: 'Change 3 of 7' },
    { key: 'agent', text: 'Connected' }
  ]
  it('keeps every field in a wide window', () => {
    expect(fitStatusFields(fields, 1200).map((f) => f.key)).toEqual(['files', 'comments', 'change', 'agent'])
  })
  it('drops the least important fields first and never cuts one', () => {
    expect(fitStatusFields(fields, 480).map((f) => f.key)).toEqual(['files', 'comments'])
    expect(fitStatusFields(fields, 200).map((f) => f.key)).toEqual(['files'])
  })
  it('measures nothing before the window has a width', () => {
    expect(fitStatusFields(fields, 0)).toHaveLength(4)
  })
})
