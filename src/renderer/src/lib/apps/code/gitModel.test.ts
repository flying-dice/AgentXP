import { describe, expect, it } from 'vitest'
import type { GitLineChange } from '@shared/git'
import { anchorLine, changeAtLine, indexGitStatus, marksOf, stepChange } from './gitModel'

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
