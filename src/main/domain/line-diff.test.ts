import { describe, expect, it } from 'vitest'
import { countLineChanges, splitLines } from './line-diff'

describe('splitLines', () => {
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
