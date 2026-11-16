import { describe, expect, it } from 'vitest'
import type { DriveDto } from '@shared/vfs'
import { breadcrumbs, cwdLabel, driveGroups, driveOf, driveTitle, favourites, libraries, parseAddress, sortDrives, upPath } from './explorerModel'

const c: DriveDto = { letter: 'C', label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null }
const e: DriveDto = { letter: 'E', label: 'claude-code-win', kind: 'removable', folderId: 1, pluggedAt: '2026-11-16T09:00:00Z' }
const f: DriveDto = { letter: 'F', label: 'dotfiles', kind: 'removable', folderId: 2, pluggedAt: '2026-11-16T09:05:00Z' }

describe('explorerModel', () => {
  it('titles drives like Windows', () => {
    expect(driveTitle(e)).toBe('claude-code-win (E:)')
    expect(driveTitle(c)).toBe('Local Disk (C:)')
  })

  it('sorts C: first and removable drives by letter', () => {
    expect(sortDrives([f, e, c]).map((d) => d.letter)).toEqual(['C', 'E', 'F'])
    expect(sortDrives([e, c]).map((d) => d.letter)).toEqual(['C', 'E'])
  })

  it('groups drives into hard disks and removable storage', () => {
    const { hardDisks, removable } = driveGroups([f, c, e])
    expect(hardDisks.map((d) => d.letter)).toEqual(['C'])
    expect(removable.map((d) => d.letter)).toEqual(['E', 'F'])
  })

  it('builds breadcrumbs from Computer down', () => {
    expect(breadcrumbs('', [c, e])).toEqual([{ label: 'Computer', path: '' }])
    expect(breadcrumbs('E:\\src\\auth', [c, e])).toEqual([
      { label: 'Computer', path: '' },
      { label: 'claude-code-win (E:)', path: 'E:\\' },
      { label: 'src', path: 'E:\\src' },
      { label: 'auth', path: 'E:\\src\\auth' }
    ])
  })

  it('shows a bare letter for an unplugged drive', () => {
    expect(breadcrumbs('G:\\x', [c]).map((x) => x.label)).toEqual(['Computer', 'G:', 'x'])
  })

  it('goes up to Computer from a drive root', () => {
    expect(upPath('E:\\src')).toBe('E:\\')
    expect(upPath('E:\\')).toBe('')
    expect(upPath('')).toBe('')
  })

  it('parses what the user types in the address bar', () => {
    expect(parseAddress('Computer', [c, e])).toBe('')
    expect(parseAddress('  ', [c, e])).toBe('')
    expect(parseAddress('e:/src//auth', [c, e])).toBe('E:\\src\\auth')
    expect(parseAddress('claude-code-win (E:)', [c, e])).toBe('E:\\')
    expect(parseAddress('Computer > E:\\src', [c, e])).toBe('E:\\src')
    expect(parseAddress('src/auth', [c, e])).toBeNull()
    expect(parseAddress('E:\\..\\x', [c, e])).toBeNull()
  })

  it('knows the nav pane places of the home folder', () => {
    expect(favourites('C:\\Users\\Agent').map((p) => p.path)).toEqual(['C:\\Users\\Agent\\Desktop', 'C:\\Users\\Agent\\Downloads'])
    expect(libraries('C:\\Users\\Agent')[0].path).toBe('C:\\Users\\Agent\\Documents')
  })

  it('finds the drive of a path', () => {
    expect(driveOf('E:\\src', [c, e])).toBe(e)
    expect(driveOf('', [c, e])).toBeNull()
    expect(driveOf('Z:\\a', [c, e])).toBeNull()
  })

  it('names a working directory', () => {
    expect(cwdLabel('E:\\', [c, e])).toBe('claude-code-win')
    expect(cwdLabel('E:\\src', [c, e])).toBe('src')
    expect(cwdLabel('C:\\Users\\Agent', [c, e])).toBe('Agent')
    expect(cwdLabel('G:\\', [c, e])).toBe('G:')
  })
})
