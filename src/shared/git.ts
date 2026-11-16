/**
 * Git awareness of the Code app: status of a drive's repository and the line changes of a working file against HEAD.
 * Main runs the `git` CLI (read only, except `revertHunk`, which rewrites the working file); everything here is
 * virtual paths (VPath) in and out, like the rest of the virtual file system.
 *
 * Pure types and pure helpers only.
 */
import type { Id } from './models'
import type { VPath } from './vfs'

/**
 * One status letter, as in `git status --short`: `M` modified, `A` added, `D` deleted, `R` renamed, `C` copied,
 * `T` type changed, `U` unmerged, `?` untracked, ' ' unchanged.
 */
export type GitCode = string

export interface GitEntryDto {
  path: VPath
  /** Staged state (index vs HEAD). */
  index: GitCode
  /** Working tree state (working tree vs index). Untracked files are `?` / `?`; conflicts have a `U` or `AA` / `DD` pair. */
  worktree: GitCode
  /** The old path of a rename or copy. */
  origPath?: VPath
}

export interface GitStatusDto {
  /** Branch name; the short commit id when HEAD is detached; `(no commits yet)` for a fresh repository. */
  branch: string
  /** Commits ahead of / behind the upstream branch (0 without an upstream). */
  ahead: number
  behind: number
  entries: GitEntryDto[]
}

/**
 * One change of the working file against HEAD, in new-file line numbers (1-based):
 *  - `added`: lines start..end are new.
 *  - `modified`: lines start..end replace `oldLines`.
 *  - `deleted`: `oldLines` were removed after line `start` (= `end`; 0 means before the first line).
 */
export interface GitLineChange {
  kind: 'added' | 'modified' | 'deleted'
  start: number
  end: number
  /** The HEAD lines this change replaced or removed (without line terminators). */
  oldLines: string[]
  /** The HEAD side of this change ended without a newline at the end of the file (used when reverting). */
  noEolOld?: boolean
  /** The working side of this change ends without a newline at the end of the file. */
  noEolNew?: boolean
}

export interface GitApi {
  /** The status of the repository `root` is in (a drive root or a folder in it); null when it is not in a repository or git is missing. */
  status(desktopId: Id, root: VPath): Promise<GitStatusDto | null>
  /** The changes of the working file against HEAD (an untracked file is one added hunk); [] when unchanged, ignored or not in a repository. */
  lineChanges(desktopId: Id, path: VPath): Promise<GitLineChange[]>
  /** The text of the file at HEAD; null when it is not in HEAD or not in a repository. */
  headText(desktopId: Id, path: VPath): Promise<string | null>
  /** Rewrites the working file with the HEAD lines in place of that change (a user write, not recorded as an agent change). */
  revertHunk(desktopId: Id, path: VPath, hunkIndex: number): Promise<void>
}

export interface GitEvents {
  /** Something in the repository of this drive may have changed (agent edit, user save, poll while a Code window is open). */
  'git.changed': { desktopId: Id; root: VPath }
}

// ---------------------------------------------------------------- pure helpers

export type GitFileState = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflict'

const CONFLICT_PAIRS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

/** The one state a tree shows for an entry (conflict > untracked > deleted > renamed > added > modified). */
export function gitFileState(entry: Pick<GitEntryDto, 'index' | 'worktree'>): GitFileState {
  const { index, worktree } = entry
  if (index === 'U' || worktree === 'U' || CONFLICT_PAIRS.has(index + worktree)) return 'conflict'
  if (index === '?' || worktree === '?') return 'untracked'
  if (index === 'D' || worktree === 'D') return 'deleted'
  if (index === 'R' || worktree === 'R' || index === 'C' || worktree === 'C') return 'renamed'
  if (index === 'A') return 'added'
  return 'modified'
}

/** Status letter and tooltip text per state. */
export const GIT_STATE_INFO: Record<GitFileState, { letter: string; text: string }> = {
  modified: { letter: 'M', text: 'Modified' },
  added: { letter: 'A', text: 'Added' },
  deleted: { letter: 'D', text: 'Deleted' },
  renamed: { letter: 'R', text: 'Renamed' },
  untracked: { letter: 'U', text: 'Untracked' },
  conflict: { letter: '!', text: 'Conflict' }
}

/** Severity order for the dot of a folder: the "worst" state below it wins. */
const SEVERITY: GitFileState[] = ['conflict', 'deleted', 'modified', 'renamed', 'added', 'untracked']
export const worstGitState = (states: Iterable<GitFileState>): GitFileState | null => {
  const seen = new Set(states)
  return SEVERITY.find((s) => seen.has(s)) ?? null
}

/** "main", "main ↑1 ↓2" */
export function formatBranch(status: Pick<GitStatusDto, 'branch' | 'ahead' | 'behind'>): string {
  const parts = [status.branch]
  if (status.ahead > 0) parts.push(`↑${status.ahead}`)
  if (status.behind > 0) parts.push(`↓${status.behind}`)
  return parts.join(' ')
}
