/** Pure helpers of the Code app's git awareness: status per path and folder, gutter marks, change navigation. */
import { gitFileState, worstGitState, type GitFileState, type GitLineChange, type GitStatusDto } from '@shared/git'
import type { GutterMark } from '../../kit/organisms/CodeViewer'
import { normaliseVPath, vpathParent, type VPath } from '@shared/vfs'

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
