import { describe, expect, it } from 'vitest'
import { computeDiff, countLineChanges, diffSequences, diffStats, parseUnifiedDiff, splitLines, toSplitRows } from './diff'

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


describe('splitLines (null and CRLF)', () => {
  it('treats null and empty as no lines', () => {
    expect(splitLines(null)).toEqual([])
    expect(splitLines('')).toEqual([])
  })
  it('ignores one trailing newline and handles CRLF', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
    expect(splitLines('a\r\nb')).toEqual(['a', 'b'])
    expect(splitLines('a\n\n')).toEqual(['a', ''])
  })
})

describe('countLineChanges', () => {
  it('is zero for identical text', () => {
    expect(countLineChanges('a\nb\n', 'a\nb\n')).toEqual({ additions: 0, deletions: 0 })
  })
  it('counts a new file as all additions', () => {
    expect(countLineChanges(null, 'a\nb\nc\n')).toEqual({ additions: 3, deletions: 0 })
  })
  it('counts a deleted file as all deletions', () => {
    expect(countLineChanges('a\nb\n', null)).toEqual({ additions: 0, deletions: 2 })
  })
  it('counts a replaced line as one addition and one deletion', () => {
    expect(countLineChanges('a\nb\nc\n', 'a\nB\nc\n')).toEqual({ additions: 1, deletions: 1 })
  })
  it('counts pure insertions and removals in the middle', () => {
    expect(countLineChanges('a\nc\n', 'a\nb\nc\n')).toEqual({ additions: 1, deletions: 0 })
    expect(countLineChanges('a\nb\nc\n', 'a\nc\n')).toEqual({ additions: 0, deletions: 1 })
  })
  it('handles interleaved edits via LCS', () => {
    // ABCABBA -> CBABAC: LCS length 4 => 3 deletions, 2 additions
    const a = 'A\nB\nC\nA\nB\nB\nA'
    const b = 'C\nB\nA\nB\nA\nC'
    expect(countLineChanges(a, b)).toEqual({ additions: 2, deletions: 3 })
  })
  it('handles completely different text', () => {
    expect(countLineChanges('a\nb', 'x\ny\nz')).toEqual({ additions: 3, deletions: 2 })
  })
  it('matches a brute-force LCS on random inputs', () => {
    const lcs = (a: string[], b: string[]): number => {
      const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1])
      return t[a.length][b.length]
    }
    let seed = 7
    const rnd = (n: number): number => (seed = (seed * 1103515245 + 12345) % 2147483648) % n
    for (let run = 0; run < 200; run++) {
      const a = Array.from({ length: rnd(12) }, () => 'xyz'[rnd(3)])
      const b = Array.from({ length: rnd(12) }, () => 'xyz'[rnd(3)])
      const common = lcs(a, b)
      const expected = { additions: b.length - common, deletions: a.length - common }
      expect(countLineChanges(a.join('\n'), b.join('\n'))).toEqual(expected)
    }
  })
})
