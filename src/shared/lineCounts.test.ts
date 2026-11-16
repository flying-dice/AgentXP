import { describe, expect, it } from 'vitest'
import { CANNOT_READ_TEXT, changeCounts, changeCountsText } from './lineCounts'

describe('changeCounts', () => {
  it('counts a three-line change the same way the Changes pane does (3 added, 3 removed)', () => {
    const counts = changeCounts('a\nb\nc\nd\ne\n', 'a\nX\nY\nZ\ne\n')
    expect(counts).toEqual({ kind: 'partial', additions: 3, deletions: 3 })
    expect(changeCountsText(counts)).toBe('3 lines added, 3 removed')
  })
  it('a new file is not a replacement', () => {
    const counts = changeCounts('', 'x\ny\n')
    expect(counts).toEqual({ kind: 'new', additions: 2, deletions: 0 })
    expect(changeCountsText(counts)).toBe('2 lines added, 0 removed')
  })
  it('says "replaces the whole file" only when every line changes', () => {
    const counts = changeCounts('a\nb\n', 'x\ny\nz\n')
    expect(counts.kind).toBe('whole')
    expect(changeCountsText(counts)).toBe('3 lines added, 2 removed. This replaces the whole file.')
  })
  it('does not claim anything when the old text could not be read', () => {
    const counts = changeCounts(null, 'x\ny\n')
    expect(counts.kind).toBe('unknown')
    expect(changeCountsText(counts)).toBe(CANNOT_READ_TEXT)
    expect(changeCountsText(counts)).not.toMatch(/whole file/)
  })
  it('uses the singular for one line', () => {
    expect(changeCountsText(changeCounts('a\nb\n', 'a\nc\n'))).toBe('1 line added, 1 removed')
  })
})
