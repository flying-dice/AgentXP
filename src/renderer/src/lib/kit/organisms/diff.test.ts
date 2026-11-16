import { describe, expect, it } from 'vitest'
import { computeDiff, diffSequences, diffStats, parseUnifiedDiff, splitLines, toSplitRows } from './diff'

const apply = (ops: ReturnType<typeof diffSequences>, kind: 'add' | 'del'): string[] =>
  ops.filter((o) => o.kind === 'equal' || o.kind !== kind).map((o) => o.text)

describe('diffSequences', () => {
  it('reconstructs both sides', () => {
    const a = 'a b c a b b a'.split(' ')
    const b = 'c b a b a c'.split(' ')
    const ops = diffSequences(a, b)
    expect(apply(ops, 'add')).toEqual(a)
    expect(apply(ops, 'del')).toEqual(b)
    // Myers' classic example has an edit distance of 5.
    expect(ops.filter((o) => o.kind !== 'equal')).toHaveLength(5)
  })

  it('handles empty inputs and identical inputs', () => {
    expect(diffSequences([], ['x'])).toEqual([{ kind: 'add', text: 'x' }])
    expect(diffSequences(['x'], [])).toEqual([{ kind: 'del', text: 'x' }])
    expect(diffSequences(['x', 'y'], ['x', 'y']).every((o) => o.kind === 'equal')).toBe(true)
  })
})

describe('splitLines', () => {
  it('ignores one trailing newline and CRLF', () => {
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b'])
    expect(splitLines('')).toEqual([])
    expect(splitLines('a\n\n')).toEqual(['a', ''])
  })
})

describe('computeDiff', () => {
  const oldText = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].join('\n')
  const newText = ['one', 'two', 'THREE', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'].join('\n')

  it('produces numbered hunks with context', () => {
    const hunks = computeDiff(oldText, newText, 2)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].header).toBe('@@ -1,5 +1,5 @@')
    expect(hunks[0].lines.map((l) => l.kind)).toEqual(['context', 'context', 'del', 'add', 'context', 'context'])
    expect(hunks[1].header).toBe('@@ -9,2 +9,3 @@')
    expect(diffStats(hunks)).toEqual({ added: 2, removed: 1 })
  })

  it('merges hunks whose context overlaps', () => {
    expect(computeDiff(oldText, newText, 4)).toHaveLength(1)
  })

  it('returns no hunks for equal text', () => {
    expect(computeDiff('a\nb', 'a\nb')).toEqual([])
  })

  it('numbers lines on both sides', () => {
    const [h] = computeDiff('a\nb\nc', 'a\nc\nd', 1)
    expect(h.lines).toEqual([
      { kind: 'context', text: 'a', oldNo: 1, newNo: 1 },
      { kind: 'del', text: 'b', oldNo: 2 },
      { kind: 'context', text: 'c', oldNo: 3, newNo: 2 },
      { kind: 'add', text: 'd', newNo: 3 }
    ])
  })

  it('handles a hunk that only adds (old side empty)', () => {
    const [h] = computeDiff('', 'x\ny')
    expect(h.header).toBe('@@ -0,0 +1,2 @@')
  })
})

describe('parseUnifiedDiff', () => {
  const text = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 111..222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,3 +1,4 @@ function f() {',
    ' keep',
    '-old',
    '+new',
    '+extra',
    ' tail',
    '\\ No newline at end of file',
    'diff --git a/b.txt b/b.txt',
    '--- /dev/null',
    '+++ b/b.txt',
    '@@ -0,0 +1 @@',
    '+hello'
  ].join('\n')

  it('parses files, hunks and numbers', () => {
    const files = parseUnifiedDiff(text)
    expect(files).toHaveLength(2)
    expect(files[0].newPath).toBe('src/a.ts')
    expect(files[0].hunks[0].header).toBe('@@ -1,3 +1,4 @@ function f() {')
    expect(files[0].hunks[0].lines).toEqual([
      { kind: 'context', text: 'keep', oldNo: 1, newNo: 1 },
      { kind: 'del', text: 'old', oldNo: 2 },
      { kind: 'add', text: 'new', newNo: 2 },
      { kind: 'add', text: 'extra', newNo: 3 },
      { kind: 'context', text: 'tail', oldNo: 3, newNo: 4 }
    ])
    expect(files[1].oldPath).toBeUndefined()
    expect(files[1].hunks[0].lines).toEqual([{ kind: 'add', text: 'hello', newNo: 1 }])
  })

  it('accepts a bare hunk without file headers', () => {
    const files = parseUnifiedDiff('@@ -1 +1 @@\n-a\n+b')
    expect(files).toHaveLength(1)
    expect(diffStats(files[0].hunks)).toEqual({ added: 1, removed: 1 })
  })

  it('does not mistake "--- " content lines for headers inside a hunk', () => {
    const files = parseUnifiedDiff('--- a/x\n+++ b/x\n@@ -1,2 +1,1 @@\n--- removed dashes\n keep')
    expect(files[0].hunks[0].lines[0]).toEqual({ kind: 'del', text: '-- removed dashes', oldNo: 1 })
  })
})

describe('toSplitRows', () => {
  it('pairs deletions with following additions', () => {
    const [h] = computeDiff('a\nb\nc\nd', 'a\nX\nY\nd', 1)
    const rows = toSplitRows(h)
    expect(rows.map((r) => [r.left?.text, r.right?.text])).toEqual([
      ['a', 'a'],
      ['b', 'X'],
      ['c', 'Y'],
      ['d', 'd']
    ])
  })

  it('leaves the missing side empty', () => {
    const [h] = computeDiff('a', 'a\nb', 1)
    const rows = toSplitRows(h)
    expect(rows[1].left).toBeUndefined()
    expect(rows[1].right?.text).toBe('b')
  })
})
