/**
 * The WinDiff block model: the whole file as one list of rows (the "expanded view"), the coloured blocks of the left
 * margin bar (red = removed lines, yellow = added lines, like Windows' WinDiff) and the change regions F7 steps through.
 * Pure: shared by the renderer and the tests.
 */
import { computeDiff, splitLines, toSplitRows, type DiffLine, type SplitRow } from './diff'

/** What a row of the expanded view is. `both` is a side-by-side row that pairs a removed with an added line. */
export type RowKind = 'context' | 'del' | 'add' | 'both'

export interface MarginBlock {
  kind: 'del' | 'add' | 'both'
  /** Start and size as fractions of the whole file (0..1), for the margin bar. */
  top: number
  height: number
  /** The first row of the block in the row list. */
  row: number
  /** Number of rows. */
  rows: number
}

/** A maximal run of changed rows: one step of F7. */
export interface ChangeRegion {
  start: number
  /** Inclusive. */
  end: number
}

/** The full-file diff: every line of both files in order (`context = Infinity`); an unchanged file is all context. */
export function fullDiffLines(oldText: string, newText: string): DiffLine[] {
  const [hunk] = computeDiff(oldText, newText, Infinity)
  if (hunk) return hunk.lines
  return splitLines(newText).map((text, i) => ({ kind: 'context' as const, text, oldNo: i + 1, newNo: i + 1 }))
}

/** The full-file diff paired for the side-by-side view. */
export function fullSplitRows(lines: readonly DiffLine[]): SplitRow[] {
  return toSplitRows({ oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, header: '', lines: [...lines] })
}

export const unifiedKinds = (lines: readonly DiffLine[]): RowKind[] => lines.map((l) => l.kind)

export const splitKinds = (rows: readonly SplitRow[]): RowKind[] =>
  rows.map((r): RowKind => (r.left && r.right ? (r.left.kind === 'context' ? 'context' : 'both') : r.left ? 'del' : 'add'))

/** Consecutive rows of the same changed kind become one margin block. */
export function marginBlocks(kinds: readonly RowKind[]): MarginBlock[] {
  const total = Math.max(1, kinds.length)
  const blocks: MarginBlock[] = []
  let i = 0
  while (i < kinds.length) {
    const kind = kinds[i]
    if (kind === 'context') {
      i++
      continue
    }
    let j = i
    while (j < kinds.length && kinds[j] === kind) j++
    blocks.push({ kind, top: i / total, height: (j - i) / total, row: i, rows: j - i })
    i = j
  }
  return blocks
}

/** The change regions (an F7 step each): runs of rows that are not context. */
export function changeRegions(kinds: readonly RowKind[]): ChangeRegion[] {
  const regions: ChangeRegion[] = []
  let start = -1
  kinds.forEach((kind, i) => {
    if (kind !== 'context' && start < 0) start = i
    if (kind === 'context' && start >= 0) {
      regions.push({ start, end: i - 1 })
      start = -1
    }
  })
  if (start >= 0) regions.push({ start, end: kinds.length - 1 })
  return regions
}

/**
 * The region F7 (`1`) or Shift+F7 (`-1`) goes to from the row the user is at (`null` = nothing selected yet).
 * Wraps around; null when the file has no change.
 */
export function stepRegion(regions: readonly ChangeRegion[], currentRow: number | null, direction: 1 | -1): number | null {
  if (regions.length === 0) return null
  if (currentRow === null) return direction === 1 ? 0 : regions.length - 1
  const inside = regions.findIndex((r) => currentRow >= r.start && currentRow <= r.end)
  if (inside >= 0) return (inside + direction + regions.length) % regions.length
  if (direction === 1) {
    const next = regions.findIndex((r) => r.start > currentRow)
    return next >= 0 ? next : 0
  }
  const before = regions.findLastIndex((r) => r.end < currentRow)
  return before >= 0 ? before : regions.length - 1
}

/** Counts for the outline row ("+3 -1"). */
export function rowStats(kinds: readonly RowKind[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const k of kinds) {
    if (k === 'add' || k === 'both') added++
    if (k === 'del' || k === 'both') removed++
  }
  return { added, removed }
}
