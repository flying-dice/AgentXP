import { describe, expect, it } from 'vitest'
import type { GitLineChange } from '@shared/git'
import { gitRowTooltip, changedLineNumbers, GIT_STATE_WORD, NOT_A_GIT_REPOSITORY, TURN_ON_GIT_TEXT, countsByPath, gitLinesLabel, rowReviewPath, anchorLine, changeAtLine, gitTabTitle, gitTabTooltip, indexGitStatus, marksOf, relativeToRoot, stepChange } from './gitModel'

const changes: GitLineChange[] = [
  { kind: 'added', start: 2, end: 3, oldLines: [] },
  { kind: 'modified', start: 10, end: 10, oldLines: ['x'] },
  { kind: 'deleted', start: 20, end: 20, oldLines: ['y'] }
]

describe('indexGitStatus', () => {
  it('gives files their state and every folder above the worst one', () => {
    const { files, dirs } = indexGitStatus([
      { branch: 'main', ahead: 0, behind: 0, entries: [{ path: 'E:\\src\\auth\\a.ts', index: ' ', worktree: 'M' }, { path: 'E:\\src\\new.ts', index: '?', worktree: '?' }, { path: 'E:\\src\\auth\\b.ts', index: ' ', worktree: 'D' }] },
      null
    ])
    expect(files.get('E:\\src\\auth\\a.ts')).toBe('modified')
    expect(files.get('E:\\src\\new.ts')).toBe('untracked')
    expect(dirs.get('E:\\src\\auth')).toBe('deleted')
    expect(dirs.get('E:\\src')).toBe('deleted')
    expect(dirs.get('E:\\')).toBe('deleted')
  })
})

describe('change navigation', () => {
  it('maps changes to marks and anchors a deletion at the top to line 1', () => {
    expect(marksOf(changes)[2]).toEqual({ kind: 'deleted', line: 20, end: 20, index: 2 })
    expect(anchorLine({ kind: 'deleted', start: 0 })).toBe(1)
  })
  it('steps forward and backward with wrap-around', () => {
    expect(stepChange(changes, null, 1)).toBe(0)
    expect(stepChange(changes, 2, 1)).toBe(1)
    expect(stepChange(changes, 20, 1)).toBe(0)
    expect(stepChange(changes, 10, -1)).toBe(0)
    expect(stepChange(changes, 2, -1)).toBe(2)
    expect(stepChange([], 1, 1)).toBeNull()
  })
  it('finds the change at a line', () => {
    expect(changeAtLine(changes, 3)).toBe(0)
    expect(changeAtLine(changes, 20)).toBe(2)
    expect(changeAtLine(changes, 5)).toBeNull()
  })
})

describe('words of the Git list (UX-39)', () => {
  it('uses plain words instead of M and U', () => {
    expect(GIT_STATE_WORD.modified).toBe('Modified')
    expect(GIT_STATE_WORD.untracked).toBe('New file')
  })
  it('names the tab and its tooltip', () => {
    expect(gitTabTitle(3)).toBe('Git (3)')
    expect(gitTabTitle(0)).toBe('Git')
    expect(gitTabTooltip(3)).toBe('Git: 3 files with changes that are not saved in version control')
    expect(gitTabTooltip(1)).toBe('Git: 1 file with changes that are not saved in version control')
    expect(gitTabTooltip(0)).toBe('Git: no file has changes that are not saved in version control')
  })
  it('explains a folder that is not tracked', () => {
    expect(NOT_A_GIT_REPOSITORY).toContain('hidden folder named .git')
    expect(NOT_A_GIT_REPOSITORY).toContain('does not change your files')
    expect(TURN_ON_GIT_TEXT).toContain('Your files do not change')
  })
  it('gives the path of a file below a root with slashes', () => {
    expect(relativeToRoot('E:\\', 'E:\\src\\auth\\redirect.ts')).toBe('src/auth/redirect.ts')
    expect(relativeToRoot('E:\\app', 'E:\\app\\a.ts')).toBe('a.ts')
    expect(relativeToRoot('E:\\', 'F:\\a.ts')).toBeNull()
    expect(relativeToRoot('E:\\app', 'E:\\other\\a.ts')).toBeNull()
  })
})

describe('Git rows (UX-78)', () => {
  it('shows + lines / - lines, empty while the counts are unknown', () => {
    const counts = countsByPath([{ path: 'src/redirect.ts', additions: 4, deletions: 1 }])
    expect(gitLinesLabel(counts.get('src/redirect.ts'))).toBe('+4 / -1')
    expect(gitLinesLabel(counts.get('missing.ts'))).toBe('')
  })
  it('opens the path of the row that was activated, not the first row', () => {
    const rows = [{ id: 'E:\\src\\login.ts' }, { id: 'E:\\src\\redirect.ts' }]
    expect(rowReviewPath(rows, 'E:\\src\\redirect.ts')).toBe('E:\\src\\redirect.ts')
    expect(rowReviewPath(rows, 'E:\\gone.ts')).toBeNull()
  })
})

describe('gitRowTooltip', () => {
  it('names the lines that changed, as the hunks give them', () => {
    const hunks: GitLineChange[] = [
      { kind: 'modified', start: 1, end: 1, oldLines: ['a'] },
      { kind: 'modified', start: 3, end: 4, oldLines: ['b', 'c'] }
    ]
    expect(changedLineNumbers(hunks)).toEqual([1, 3, 4])
    expect(gitRowTooltip('redirect.ts', hunks)).toBe('redirect.ts: lines 1, 3 and 4 changed')
  })
  it('says line for one line and counts a deletion at the line it was cut from', () => {
    expect(gitRowTooltip('a.ts', [{ kind: 'added', start: 7, end: 7 }])).toBe('a.ts: line 7 changed')
    expect(changedLineNumbers([{ kind: 'deleted', start: 0, end: 0 }])).toEqual([1])
    expect(gitRowTooltip('a.ts', [{ kind: 'modified', start: 2, end: 3 }])).toBe('a.ts: lines 2 and 3 changed')
  })
  it('uses ranges when the list is long, and is empty without hunks', () => {
    expect(gitRowTooltip('big.ts', [{ kind: 'added', start: 1, end: 40 }, { kind: 'modified', start: 50, end: 50 }])).toBe('big.ts: lines 1-40 and 50 changed')
    expect(gitRowTooltip('a.ts', undefined)).toBe('')
    expect(gitRowTooltip('a.ts', [])).toBe('')
  })
})
