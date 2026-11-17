import { describe, expect, it } from 'vitest'
import type { DriveDto } from '@shared/vfs'
import { defaultLookIn, explorerSearchKey, searchLookIn, searchRows, searchStatus } from './explorerSearch'

const drive = (letter: string, kind: DriveDto['kind'], label: string): DriveDto => ({ letter, kind, label, folderId: kind === 'system' ? null : 1, pluggedAt: null })
const drives = [drive('E', 'removable', 'app'), drive('C', 'system', 'Local Disk')]

describe('explorerSearch', () => {
  it('makes Search Results rows: name, folder and type', () => {
    const rows = searchRows([
      { name: 'a.ts', path: 'E:\\src\\a.ts', kind: 'file', size: 1, modifiedAt: null },
      { name: 'lib', path: 'E:\\lib', kind: 'directory', size: null, modifiedAt: null }
    ])
    expect(rows.map((r) => [r.id, r.icon, r.name, r.folder])).toEqual([
      ['E:\\src\\a.ts', 'file-code', 'a.ts', 'E:\\src'],
      ['E:\\lib', 'folder', 'lib', 'E:\\']
    ])
  })

  it('looks in the folder shown first, then every drive', () => {
    expect(searchLookIn('E:\\src', drives).map((i) => i.value)).toEqual(['E:\\src', 'C:\\', 'E:\\'])
    expect(searchLookIn('', drives).map((i) => i.label)).toEqual(['Local Disk (C:)', 'app (E:)'])
    expect(searchLookIn('C:\\', drives)).toHaveLength(2)
  })

  it('starts in the folder shown, else the first project, else C:', () => {
    expect(defaultLookIn('E:\\src', drives)).toBe('E:\\src')
    expect(defaultLookIn('', drives)).toBe('E:\\')
    expect(defaultLookIn('', [drive('C', 'system', 'Local Disk')])).toBe('C:\\')
  })

  it('says what the search did', () => {
    expect(searchStatus(null, false, null)).toMatch(/Then click Search/)
    expect(searchStatus(null, true, null)).toBe('Searching...')
    expect(searchStatus(null, false, 'Bad')).toBe('Bad')
    expect(searchStatus({ entries: [], truncated: false }, false, null)).toBe('Search is complete. There are no results to display.')
    const one = { name: 'a', path: 'E:\\a', kind: 'file' as const, size: 1, modifiedAt: null }
    expect(searchStatus({ entries: [one], truncated: false }, false, null)).toBe('Search is complete. 1 file found.')
    expect(searchStatus({ entries: [one, one], truncated: true }, false, null)).toMatch(/2\+ files found \(more not shown/)
    expect(explorerSearchKey(undefined)).toBe('null')
  })
})
