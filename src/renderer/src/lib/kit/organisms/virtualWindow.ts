/** The windowing maths of `VirtualList`: row offsets from cached heights, and the rows to render for a scroll position. */

/** Prefix sums: `offsets[i]` is the top of row i, `offsets[n]` the total height. Rows not measured yet count `estimate`. */
export function buildOffsets(keys: readonly string[], heights: ReadonlyMap<string, number>, estimate: number): Float64Array {
  const offsets = new Float64Array(keys.length + 1)
  for (let i = 0; i < keys.length; i++) offsets[i + 1] = offsets[i] + (heights.get(keys[i]) ?? estimate)
  return offsets
}

/** The index of the row that holds `y` (the last row for y at or past the end, 0 for an empty list). */
export function indexAt(offsets: Float64Array, y: number): number {
  const n = offsets.length - 1
  if (n <= 0) return 0
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}

export interface Range {
  /** First rendered row. */
  start: number
  /** One past the last rendered row. */
  end: number
}

/** The rows that touch the viewport, plus `overscan` pixels above and below. The scroll position is clamped to the content. */
export function visibleRange(offsets: Float64Array, scrollTop: number, viewport: number, overscan: number): Range {
  const n = offsets.length - 1
  if (n <= 0) return { start: 0, end: 0 }
  const total = offsets[n]
  const top = Math.min(Math.max(scrollTop, 0), Math.max(0, total - viewport))
  const start = indexAt(offsets, Math.max(0, top - overscan))
  const end = Math.min(n, indexAt(offsets, top + viewport + overscan) + 1)
  return { start, end }
}
