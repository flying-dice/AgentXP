/** Parser of `git status --porcelain=v2 -z --branch`. Pure; paths stay relative to the repository root. */

export interface RawGitEntry {
  /** Relative to the repository root, `/`-separated. */
  path: string
  index: string
  worktree: string
  origPath?: string
}

export interface RawGitStatus {
  branch: string
  ahead: number
  behind: number
  entries: RawGitEntry[]
}

/** `.` (unchanged) becomes a space, like `git status --short`. */
const code = (c: string | undefined): string => (!c || c === '.' ? ' ' : c)

/** The first `fields` space-separated fields of `record` and the rest (the path, which may contain spaces). */
function split(record: string, fields: number): { head: string[]; rest: string } {
  const head: string[] = []
  let at = 0
  for (let i = 0; i < fields; i++) {
    const next = record.indexOf(' ', at)
    if (next < 0) return { head, rest: record.slice(at) }
    head.push(record.slice(at, next))
    at = next + 1
  }
  return { head, rest: record.slice(at) }
}

export function parsePorcelainV2(output: string): RawGitStatus {
  const status: RawGitStatus = { branch: '', ahead: 0, behind: 0, entries: [] }
  let oid = ''
  const records = output.split('\0')
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (record === '') continue
    const kind = record[0]
    if (kind === '#') {
      if (record.startsWith('# branch.head ')) status.branch = record.slice('# branch.head '.length)
      else if (record.startsWith('# branch.oid ')) oid = record.slice('# branch.oid '.length)
      else if (record.startsWith('# branch.ab ')) {
        const m = /\+(\d+) -(\d+)/.exec(record)
        if (m) {
          status.ahead = Number(m[1])
          status.behind = Number(m[2])
        }
      }
    } else if (kind === '1') {
      // 1 XY sub mH mI mW hH hI path
      const { head, rest } = split(record, 8)
      status.entries.push({ path: rest, index: code(head[1]?.[0]), worktree: code(head[1]?.[1]) })
    } else if (kind === '2') {
      // 2 XY sub mH mI mW hH hI Xscore path NUL origPath
      const { head, rest } = split(record, 9)
      status.entries.push({ path: rest, index: code(head[1]?.[0]), worktree: code(head[1]?.[1]), origPath: records[++i] })
    } else if (kind === 'u') {
      // u XY sub m1 m2 m3 mW h1 h2 h3 path
      const { head, rest } = split(record, 10)
      const xy = head[1] ?? 'UU'
      status.entries.push({ path: rest, index: xy[0] === '.' ? 'U' : xy[0], worktree: xy[1] === '.' ? 'U' : xy[1] })
    } else if (kind === '?') {
      status.entries.push({ path: record.slice(2), index: '?', worktree: '?' })
    }
    // '!' (ignored) records are not requested.
  }
  if (status.branch === '(detached)') status.branch = oid && oid !== '(initial)' ? oid.slice(0, 7) : 'HEAD'
  if (oid === '(initial)') status.branch = `${status.branch} (no commits yet)`
  return status
}
