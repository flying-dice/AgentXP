import type { GitLineChange } from '@shared/git'

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

/**
 * Parses the output of `git diff --no-color -U0` of one file into line changes (new-file line numbers).
 * Header lines before the first hunk (diff --git, index, rename from/to, similarity, ---, +++) are skipped,
 * `\ No newline at end of file` markers set `noEolOld` / `noEolNew` on the change they follow.
 */
export function parseUnifiedDiff(diff: string): GitLineChange[] {
  const changes: GitLineChange[] = []
  let current: { oldStart: number; oldCount: number; newStart: number; newCount: number; old: string[]; noEolOld: boolean; noEolNew: boolean } | null = null
  let last: '-' | '+' | null = null

  const flush = (): void => {
    if (!current) return
    const { oldCount, newStart, newCount } = current
    const base = { oldLines: current.old, ...(current.noEolOld ? { noEolOld: true } : {}), ...(current.noEolNew ? { noEolNew: true } : {}) }
    if (newCount === 0) {
      if (oldCount > 0) changes.push({ kind: 'deleted', start: newStart, end: newStart, ...base })
    } else if (oldCount === 0) changes.push({ kind: 'added', start: newStart, end: newStart + newCount - 1, ...base })
    else changes.push({ kind: 'modified', start: newStart, end: newStart + newCount - 1, ...base })
    current = null
  }

  for (const line of diff.split('\n')) {
    const header = HUNK.exec(line)
    if (header) {
      flush()
      current = {
        oldStart: Number(header[1]),
        oldCount: header[2] === undefined ? 1 : Number(header[2]),
        newStart: Number(header[3]),
        newCount: header[4] === undefined ? 1 : Number(header[4]),
        old: [],
        noEolOld: false,
        noEolNew: false
      }
      last = null
      continue
    }
    if (!current) continue
    if (line.startsWith('\\')) {
      if (last === '-') current.noEolOld = true
      else if (last === '+') current.noEolNew = true
    } else if (line.startsWith('-')) {
      current.old.push(line.slice(1))
      last = '-'
    } else if (line.startsWith('+')) last = '+'
    else if (line.startsWith('diff --git')) {
      flush()
      last = null
    }
  }
  flush()
  return changes
}
