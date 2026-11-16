/** Pure helpers of the Code app's git awareness: status per path and folder, gutter marks, change navigation. */
import { gitFileState, worstGitState, type GitFileState, type GitLineChange, type GitStatusDto } from '@shared/git'
import type { GutterMark } from '../../kit/organisms/CodeViewer'
import { normaliseVPath, parseVPath, vpathParent, type VPath } from '@shared/vfs'

export interface GitIndex {
  /** The state of every changed file. */
  files: Map<VPath, GitFileState>
  /** The worst state below every folder up to the drive root (the folder's dot). */
  dirs: Map<VPath, GitFileState>
}

/** Index of the entries of several repositories (one per drive). */
export function indexGitStatus(statuses: readonly (GitStatusDto | null)[]): GitIndex {
  const files = new Map<VPath, GitFileState>()
  const below = new Map<VPath, GitFileState[]>()
  for (const status of statuses) {
    for (const entry of status?.entries ?? []) {
      const path = normaliseVPath(entry.path) ?? entry.path
      const state = gitFileState(entry)
      files.set(path, state)
      for (let dir = vpathParent(path); dir !== null; dir = vpathParent(dir)) {
        const list = below.get(dir)
        if (list) list.push(state)
        else below.set(dir, [state])
      }
    }
  }
  const dirs = new Map<VPath, GitFileState>()
  for (const [dir, states] of below) {
    const worst = worstGitState(states)
    if (worst) dirs.set(dir, worst)
  }
  return { files, dirs }
}

export const marksOf = (changes: readonly GitLineChange[]): GutterMark[] =>
  changes.map((c, index) => ({ kind: c.kind, line: c.start, end: c.end, index }))

/** The line a change is shown at (a deleted change at line 0 is shown at line 1). */
export const anchorLine = (change: Pick<GitLineChange, 'kind' | 'start'>): number => Math.max(1, change.start)

/**
 * The next (or previous) change relative to a line, wrapping around; null when there are none.
 * `from` null starts before the first line.
 */
export function stepChange(changes: readonly GitLineChange[], from: number | null, direction: 1 | -1): number | null {
  if (changes.length === 0) return null
  const anchors = changes.map(anchorLine)
  if (from === null) return direction === 1 ? 0 : changes.length - 1
  if (direction === 1) {
    const next = anchors.findIndex((a) => a > from)
    return next < 0 ? 0 : next
  }
  const before = anchors.findLastIndex((a) => a < from)
  return before < 0 ? changes.length - 1 : before
}

/** The change a caret/viewport line belongs to (inside its range, or on a deleted change's anchor). */
export const changeAtLine = (changes: readonly GitLineChange[], line: number): number | null => {
  const at = changes.findIndex((c) => (c.kind === 'deleted' ? anchorLine(c) === line : line >= c.start && line <= c.end))
  return at < 0 ? null : at
}

/** The words the Git list shows: no M, A or U (UX-39, F-037). */
export const GIT_STATE_WORD: Record<GitFileState, string> = {
  modified: 'Modified',
  added: 'New file',
  deleted: 'Deleted',
  renamed: 'Renamed',
  untracked: 'New file',
  conflict: 'Conflict'
}

/** "Git (3)": the tab of the Git list. */
export const gitTabTitle = (count: number): string => (count > 0 ? `Git (${count})` : 'Git')

/** The tooltip of the Git tab: "Git: 3 files with changes that are not saved in version control" (UX-78). */
export const gitTabTooltip = (count: number): string =>
  count === 0
    ? 'Git: no file has changes that are not saved in version control'
    : `Git: ${count} ${count === 1 ? 'file' : 'files'} with changes that are not saved in version control`

/** What the Git list says for a folder that git does not track, and what to do (UX-82). */
export const NOT_A_GIT_REPOSITORY =
  'This folder is not tracked with Git, so there are no change marks. Git is a way to keep the history of a project. You can turn it on here; this adds a hidden folder named .git and does not change your files.'

/** The question before Git is turned on (UX-82). */
export const TURN_ON_GIT_TEXT = `Turn on Git for this project?\n\nThis adds a hidden folder named .git. Your files do not change. You can delete the .git folder later to turn Git off.`

/** The "+ lines / - lines" cell of a Git row; empty when the counts are not known (yet). */
export const gitLinesLabel = (counts: { additions: number; deletions: number } | undefined): string => (counts ? `+${counts.additions} / -${counts.deletions}` : '')

/** The line counts per path (below `root`, with `/`) of a review change list, to look rows up by `relativeToRoot`. */
export const countsByPath = (changes: readonly { path: string; additions: number; deletions: number }[]): Map<string, { additions: number; deletions: number }> =>
  new Map(changes.map((c) => [c.path, { additions: c.additions, deletions: c.deletions }]))

/** What a double click or Enter on a Git row opens: the path of that very row (never the first row); null when the row is gone. */
export const rowReviewPath = (rows: readonly { id: string }[], rowId: string): string | null => rows.find((r) => r.id === rowId)?.id ?? null

/** `src/auth/redirect.ts` for the file `E:\src\auth\redirect.ts` of the root `E:\`; null when the file is not below the root. */
export function relativeToRoot(root: VPath, path: VPath): string | null {
  const r = parseVPath(root)
  const p = parseVPath(path)
  if (!r || !p || r.drive !== p.drive || p.segments.length <= r.segments.length) return null
  if (!r.segments.every((segment, i) => segment.toLowerCase() === p.segments[i].toLowerCase())) return null
  return p.segments.slice(r.segments.length).join('/')
}

/** The line numbers a file's changes touch, in order and without repeats; a deleted change counts at the line it was cut from. */
export function changedLineNumbers(changes: readonly Pick<GitLineChange, "kind" | "start" | "end">[]): number[] {
  const lines = new Set<number>()
  for (const c of changes) {
    if (c.kind === 'deleted') lines.add(anchorLine(c))
    else for (let line = c.start; line <= c.end; line++) lines.add(line)
  }
  return [...lines].sort((a, b) => a - b)
}

const MAX_LISTED_LINES = 12

/** "1, 3 and 4", or ranges ("1-3, 7 and 10-40") when the list would be long. */
function listLines(lines: readonly number[]): string {
  let parts: string[]
  if (lines.length <= MAX_LISTED_LINES) parts = lines.map(String)
  else {
    parts = []
    for (let i = 0; i < lines.length; ) {
      let j = i
      while (j + 1 < lines.length && lines[j + 1] === lines[j] + 1) j++
      parts.push(j > i ? `${lines[i]}-${lines[j]}` : String(lines[i]))
      i = j + 1
    }
  }
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/** The tooltip of a Git row: "redirect.ts: lines 1, 3 and 4 changed". Empty when the lines are not known (yet). */
export function gitRowTooltip(name: string, changes: readonly Pick<GitLineChange, "kind" | "start" | "end">[] | undefined): string {
  const lines = changes ? changedLineNumbers(changes) : []
  if (lines.length === 0) return ''
  return `${name}: ${lines.length === 1 ? 'line' : 'lines'} ${listLines(lines)} changed`
}
