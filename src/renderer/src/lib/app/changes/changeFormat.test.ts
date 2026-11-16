import { describe, expect, it } from 'vitest'
import { REVERTED_LABEL, absolutePath, changeKindLabel, changesSummary, linesLabel, revertConfirmText, splitChangePath } from './changeFormat'

describe('changeFormat', () => {
  it('labels kinds and line counts', () => {
    expect(changeKindLabel('modified')).toBe('Modified')
    expect(linesLabel({ additions: 4, deletions: 1 })).toBe('+4 / -1')
  })

  it('joins with the separator of the folder path', () => {
    expect(absolutePath('/home/a/', 'src/x.ts')).toBe('/home/a/src/x.ts')
    expect(absolutePath('C:\\Users\\a', 'src/x.ts')).toBe('C:\\Users\\a\\src\\x.ts')
  })
})

describe('changes list (UX-40)', () => {
  it('totals the files and lines', () => {
    expect(changesSummary([{ additions: 5, deletions: 1 }, { additions: 7, deletions: 2 }])).toBe('2 files, +12 -3')
    expect(changesSummary([{ additions: 1, deletions: 0 }])).toBe('1 file, +1 -0')
    expect(changesSummary([])).toBe('0 files, +0 -0')
  })

  it('splits a path into the name and the folder beside it', () => {
    expect(splitChangePath('src\\auth\\redirect.ts')).toEqual({ name: 'redirect.ts', dir: 'src\\auth' })
    expect(splitChangePath('src/auth/redirect.ts')).toEqual({ name: 'redirect.ts', dir: 'src/auth' })
    expect(splitChangePath('README.md')).toEqual({ name: 'README.md', dir: '' })
  })

  it('tells where a reverted file can be found', () => {
    expect(revertConfirmText('E:\\a.ts')).toContain('You can get it back from the Recycle Bin.')
    expect(REVERTED_LABEL).toBe('Reverted (in the Recycle Bin)')
  })
})
