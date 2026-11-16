/** Line diff (Myers O(ND)) and unified diff parsing. Pure, no DOM. */

export type DiffKind = 'context' | 'add' | 'del'

export interface DiffLine {
  kind: DiffKind
  text: string
  /** 1-based line number in the old file (absent for additions). */
  oldNo?: number
  /** 1-based line number in the new file (absent for deletions). */
  newNo?: number
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  /** `@@ -a,b +c,d @@ section` */
  header: string
  lines: DiffLine[]
}

export interface DiffFile {
  oldPath?: string
  newPath?: string
  hunks: DiffHunk[]
}

export interface SplitRow {
  left?: DiffLine
  right?: DiffLine
}

type Op = { kind: 'equal' | 'add' | 'del'; text: string }

export const splitLines = (text: string): string[] => {
  if (text === '') return []
  const lines = text.split(/\r\n|\n/)
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** Shortest edit script between two line arrays (Myers). */
export const diffSequences = (a: readonly string[], b: readonly string[]): Op[] => {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const head: Op[] = a.slice(0, start).map((text) => ({ kind: 'equal', text }))
  const tail: Op[] = a.slice(endA).map((text) => ({ kind: 'equal', text }))
  return [...head, ...myers(a.slice(start, endA), b.slice(start, endB)), ...tail]
}

const myers = (a: string[], b: string[]): Op[] => {
  const n = a.length
  const m = b.length
  if (n === 0) return b.map((text) => ({ kind: 'add', text }))
  if (m === 0) return a.map((text) => ({ kind: 'del', text }))

  const max = n + m
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  // trace[d][k + d + 1] = v[k] as it was at the start of round d.
  const trace: Int32Array[] = []
  let found = -1

  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice(offset - d - 1, offset + d + 2))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) {
        found = d
        break
      }
    }
  }

  const ops: Op[] = []
  let x = n
  let y = m
  for (let d = found; d >= 0; d--) {
    const prev = trace[d]
    const k = x - y
    const at = (kk: number): number => prev[kk + d + 1]
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1
    const prevX = at(prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x--
      y--
      ops.push({ kind: 'equal', text: a[x] })
    }
    if (d > 0) {
      if (x === prevX) ops.push({ kind: 'add', text: b[prevY] })
      else ops.push({ kind: 'del', text: a[prevX] })
    }
    x = prevX
    y = prevY
  }
  return ops.reverse()
}

const hunkHeader = (h: Omit<DiffHunk, 'header'>): string =>
  `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`

/** Numbers the ops and groups them into hunks with `context` unchanged lines around changes. */
export const buildHunks = (ops: readonly Op[], context = 3): DiffHunk[] => {
  const lines: DiffLine[] = []
  let oldNo = 0
  let newNo = 0
  for (const op of ops) {
    if (op.kind === 'equal') lines.push({ kind: 'context', text: op.text, oldNo: ++oldNo, newNo: ++newNo })
    else if (op.kind === 'del') lines.push({ kind: 'del', text: op.text, oldNo: ++oldNo })
    else lines.push({ kind: 'add', text: op.text, newNo: ++newNo })
  }

  const ranges: [number, number][] = []
  lines.forEach((line, i) => {
    if (line.kind === 'context') return
    const from = Math.max(0, i - context)
    const to = Math.min(lines.length, i + context + 1)
    const last = ranges[ranges.length - 1]
    if (last && from <= last[1]) last[1] = Math.max(last[1], to)
    else ranges.push([from, to])
  })

  return ranges.map(([from, to]) => {
    const slice = lines.slice(from, to)
    const oldLines = slice.filter((l) => l.kind !== 'add').length
    const newLines = slice.filter((l) => l.kind !== 'del').length
    const before = lines.slice(0, from)
    const oldBefore = before.filter((l) => l.kind !== 'add').length
    const newBefore = before.filter((l) => l.kind !== 'del').length
    const partial = {
      oldStart: oldLines > 0 ? oldBefore + 1 : oldBefore,
      oldLines,
      newStart: newLines > 0 ? newBefore + 1 : newBefore,
      newLines,
      lines: slice
    }
    return { ...partial, header: hunkHeader(partial) }
  })
}

export const computeDiff = (oldText: string, newText: string, context = 3): DiffHunk[] =>
  buildHunks(diffSequences(splitLines(oldText), splitLines(newText)), context)

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/

const stripPath = (raw: string): string | undefined => {
  const path = raw.split('\t')[0].trim()
  if (path === '/dev/null') return undefined
  return path.replace(/^[ab]\//, '')
}

/** Parses a unified diff (single or multi file, `git diff` or plain `diff -u`). */
export const parseUnifiedDiff = (text: string): DiffFile[] => {
  const files: DiffFile[] = []
  let file: DiffFile | undefined
  let hunk: DiffHunk | undefined
  let oldNo = 0
  let newNo = 0
  let oldLeft = 0
  let newLeft = 0

  const ensureFile = (): DiffFile => {
    if (!file) {
      file = { hunks: [] }
      files.push(file)
    }
    return file
  }

  for (const raw of text.split(/\r?\n/)) {
    const inBody = hunk !== undefined && (oldLeft > 0 || newLeft > 0)
    if (!inBody) {
      if (raw.startsWith('diff ')) {
        file = { hunks: [] }
        files.push(file)
        hunk = undefined
        continue
      }
      if (raw.startsWith('--- ')) {
        // A new "---" after hunks belongs to a new file in a plain multi-file diff.
        if (file && file.hunks.length > 0) file = undefined
        ensureFile().oldPath = stripPath(raw.slice(4))
        hunk = undefined
        continue
      }
      if (raw.startsWith('+++ ')) {
        ensureFile().newPath = stripPath(raw.slice(4))
        continue
      }
      const m = HUNK_RE.exec(raw)
      if (m) {
        const oldLines = m[2] === undefined ? 1 : Number(m[2])
        const newLines = m[4] === undefined ? 1 : Number(m[4])
        hunk = {
          oldStart: Number(m[1]),
          oldLines,
          newStart: Number(m[3]),
          newLines,
          header: raw.trimEnd(),
          lines: []
        }
        ensureFile().hunks.push(hunk)
        oldNo = hunk.oldStart
        newNo = hunk.newStart
        oldLeft = oldLines
        newLeft = newLines
      }
      continue
    }
    if (!hunk) continue
    if (raw.startsWith('\\')) continue
    const sign = raw[0]
    const body = raw.slice(1)
    if (sign === '+') {
      hunk.lines.push({ kind: 'add', text: body, newNo: newNo++ })
      newLeft--
    } else if (sign === '-') {
      hunk.lines.push({ kind: 'del', text: body, oldNo: oldNo++ })
      oldLeft--
    } else {
      hunk.lines.push({ kind: 'context', text: sign === ' ' ? body : raw, oldNo: oldNo++, newNo: newNo++ })
      oldLeft--
      newLeft--
    }
  }
  return files.filter((f) => f.hunks.length > 0)
}

export const diffStats = (hunks: readonly DiffHunk[]): { added: number; removed: number } => {
  let added = 0
  let removed = 0
  for (const h of hunks)
    for (const l of h.lines) {
      if (l.kind === 'add') added++
      else if (l.kind === 'del') removed++
    }
  return { added, removed }
}

/** Pairs deletions with the additions that follow them for the side-by-side view. */
export const toSplitRows = (hunk: DiffHunk): SplitRow[] => {
  const rows: SplitRow[] = []
  let dels: DiffLine[] = []
  let adds: DiffLine[] = []
  const flush = (): void => {
    const count = Math.max(dels.length, adds.length)
    for (let i = 0; i < count; i++) rows.push({ left: dels[i], right: adds[i] })
    dels = []
    adds = []
  }
  for (const line of hunk.lines) {
    if (line.kind === 'del') dels.push(line)
    else if (line.kind === 'add') adds.push(line)
    else {
      flush()
      rows.push({ left: line, right: line })
    }
  }
  flush()
  return rows
}
