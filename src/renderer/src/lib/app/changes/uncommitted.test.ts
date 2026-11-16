import { describe, expect, it } from 'vitest'
import type { GitStatusDto } from '@shared/git'
import { changeDrives, uncommittedChanges } from './uncommitted'

const status = (...paths: string[]): GitStatusDto => ({ branch: 'main', ahead: 0, behind: 0, entries: paths.map((path) => ({ path, index: ' ', worktree: 'M' })) })
const change = (path: string): { path: string } => ({ path })

describe('uncommittedChanges', () => {
  const changes = [change('E:\\src\\a.ts'), change('E:\\b.ts'), change('C:\\Users\\Agent\\n.txt')]

  it('drops the changes whose file Git lists as clean (committed)', () => {
    const shown = uncommittedChanges(changes, new Map([['E', status('E:\\b.ts')]]))
    expect(shown.map((c) => c.path)).toEqual(['E:\\b.ts', 'C:\\Users\\Agent\\n.txt'])
  })

  it('shows nothing of a drive once everything is committed', () => {
    expect(uncommittedChanges(changes, new Map([['E', status()]])).map((c) => c.path)).toEqual(['C:\\Users\\Agent\\n.txt'])
  })

  it('keeps every change of a drive without Git or with an unknown status', () => {
    expect(uncommittedChanges(changes, new Map([['E', null]]))).toHaveLength(3)
    expect(uncommittedChanges(changes, new Map())).toHaveLength(3)
  })

  it('compares paths without regard to case', () => {
    expect(uncommittedChanges([change('E:\\Src\\A.ts')], new Map([['E', status('e:\\src\\a.ts')]]))).toHaveLength(1)
  })

  it('lists each drive once', () => {
    expect(changeDrives(changes)).toEqual(['E', 'C'])
  })
})
