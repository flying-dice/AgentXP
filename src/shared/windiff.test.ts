import { describe, expect, it } from 'vitest'
import { changeRegions, fullDiffLines, fullSplitRows, marginBlocks, rowStats, splitKinds, stepRegion, unifiedKinds } from './windiff'

const OLD = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join('\n') + '\n'
// b removed, "X" added after d, f -> F (a removed + an added line), h kept.
const NEW = ['a', 'c', 'd', 'X', 'e', 'F', 'g', 'h'].join('\n') + '\n'

describe('fullDiffLines', () => {
  it('lists every line of both files in order, with old and new numbers', () => {
    const lines = fullDiffLines(OLD, NEW)
    expect(lines.filter((l) => l.kind !== 'add').map((l) => l.text)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(lines.filter((l) => l.kind !== 'del').map((l) => l.text)).toEqual(['a', 'c', 'd', 'X', 'e', 'F', 'g', 'h'])
    expect(lines[0]).toMatchObject({ kind: 'context', oldNo: 1, newNo: 1 })
    expect(lines.find((l) => l.text === 'b')).toMatchObject({ kind: 'del', oldNo: 2 })
    expect(lines.find((l) => l.text === 'X')).toMatchObject({ kind: 'add', newNo: 4 })
  })

  it('an unchanged file is all context and an empty old file is all additions', () => {
    expect(fullDiffLines('x\ny\n', 'x\ny\n').map((l) => l.kind)).toEqual(['context', 'context'])
    expect(fullDiffLines('', 'x\ny\n').map((l) => l.kind)).toEqual(['add', 'add'])
    expect(fullDiffLines('x\n', '').map((l) => l.kind)).toEqual(['del'])
    expect(fullDiffLines('', '')).toEqual([])
  })
})

describe('margin blocks (red = removed, yellow = added)', () => {
  const kinds = unifiedKinds(fullDiffLines(OLD, NEW))

  it('makes one block per run of changed rows, positioned as fractions of the file', () => {
    const blocks = marginBlocks(kinds)
    expect(blocks.map((b) => [b.kind, b.rows])).toEqual([
      ['del', 1],
      ['add', 1],
      ['del', 1],
      ['add', 1]
    ])
    expect(blocks[0].top).toBeCloseTo(blocks[0].row / kinds.length)
    expect(blocks.every((b) => b.top >= 0 && b.top + b.height <= 1)).toBe(true)
  })

  it('merges consecutive rows of the same kind', () => {
    expect(marginBlocks(['context', 'del', 'del', 'del', 'context', 'add', 'add'])).toMatchObject([
      { kind: 'del', row: 1, rows: 3 },
      { kind: 'add', row: 5, rows: 2 }
    ])
    expect(marginBlocks(['context', 'context'])).toEqual([])
    expect(marginBlocks([])).toEqual([])
  })

  it('shows paired side-by-side rows as one "both" block', () => {
    const kindsSplit = splitKinds(fullSplitRows(fullDiffLines('a\nb\nc\n', 'a\nB\nc\n')))
    expect(kindsSplit).toEqual(['context', 'both', 'context'])
    expect(marginBlocks(kindsSplit)).toMatchObject([{ kind: 'both', row: 1, rows: 1 }])
  })
})

describe('change regions and F7 stepping', () => {
  it('groups runs of non-context rows', () => {
    expect(changeRegions(['context', 'del', 'add', 'context', 'add', 'context', 'del'])).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 4 },
      { start: 6, end: 6 }
    ])
    expect(changeRegions(['context'])).toEqual([])
  })

  const regions = [
    { start: 2, end: 3 },
    { start: 6, end: 6 },
    { start: 9, end: 10 }
  ]

  it('F7 goes to the next region, Shift+F7 to the previous, both wrap', () => {
    expect(stepRegion(regions, null, 1)).toBe(0)
    expect(stepRegion(regions, null, -1)).toBe(2)
    expect(stepRegion(regions, 2, 1)).toBe(1)
    expect(stepRegion(regions, 3, 1)).toBe(1)
    expect(stepRegion(regions, 4, 1)).toBe(1)
    expect(stepRegion(regions, 4, -1)).toBe(0)
    expect(stepRegion(regions, 10, 1)).toBe(0)
    expect(stepRegion(regions, 11, 1)).toBe(0)
    expect(stepRegion(regions, 2, -1)).toBe(2)
    expect(stepRegion(regions, 1, -1)).toBe(2)
    expect(stepRegion([], 1, 1)).toBeNull()
  })

  it('counts added and removed lines', () => {
    expect(rowStats(['context', 'del', 'add', 'both', 'add'])).toEqual({ added: 3, removed: 2 })
  })
})
