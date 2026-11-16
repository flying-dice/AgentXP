export interface LineChangeCounts {
  additions: number
  deletions: number
}

/** Splits text into lines; a single trailing newline does not create an extra empty line. */
export function splitLines(text: string | null): string[] {
  if (!text) return []
  const lines = text.split(/\r?\n/)
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** Length of the shortest edit script (insertions + deletions) between two sequences (Myers). */
function editDistance(a: string[], b: string[]): number {
  const n = a.length
  const m = b.length
  const max = n + m
  if (max === 0) return 0
  const offset = max
  const v = new Int32Array(2 * max + 2)
  for (let d = 0; d <= max; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) return d
    }
  }
  return max
}

function commonPrefix(a: string[], b: string[]): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

function commonSuffix(a: string[], b: string[], prefix: number): number {
  let i = 0
  while (i < a.length - prefix && i < b.length - prefix && a[a.length - 1 - i] === b[b.length - 1 - i]) i++
  return i
}

/** Counts added and deleted lines between two texts (null counts as empty). */
export function countLineChanges(original: string | null, current: string | null): LineChangeCounts {
  const a = splitLines(original)
  const b = splitLines(current)
  const prefix = commonPrefix(a, b)
  const suffix = commonSuffix(a, b, prefix)
  const midA = a.slice(prefix, a.length - suffix)
  const midB = b.slice(prefix, b.length - suffix)
  const distance = editDistance(midA, midB)
  const common = (midA.length + midB.length - distance) / 2
  return { additions: midB.length - common, deletions: midA.length - common }
}
