/** Paging of long page content, so one tool result stays bounded. Pure. */

export const DEFAULT_PAGE_LINES = 150
export const MAX_PAGE_LINES = 500
/** A page also stops at this many characters (at least one line is always returned). */
export const MAX_PAGE_CHARS = 12_000

export interface Page {
  lines: string[]
  /** Index of the first line of this page. */
  offset: number
  /** Where the next page starts, or null at the end. */
  nextOffset: number | null
  total: number
}

export function paginate(lines: readonly string[], offset = 0, limit = DEFAULT_PAGE_LINES, maxChars = MAX_PAGE_CHARS): Page {
  const total = lines.length
  const start = Math.min(Math.max(0, Math.trunc(offset) || 0), total)
  const cap = Math.min(Math.max(1, Math.trunc(limit) || DEFAULT_PAGE_LINES), MAX_PAGE_LINES)
  const out: string[] = []
  let chars = 0
  for (let i = start; i < total && out.length < cap; i++) {
    const length = lines[i].length + 1
    if (out.length > 0 && chars + length > maxChars) break
    out.push(lines[i].length > maxChars ? `${lines[i].slice(0, maxChars)}...` : lines[i])
    chars += length
  }
  const end = start + out.length
  return { lines: out, offset: start, nextOffset: end < total ? end : null, total }
}
