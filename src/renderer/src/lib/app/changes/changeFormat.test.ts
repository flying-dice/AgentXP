import { describe, expect, it } from 'vitest'
import { REVERTED_KIND, REVERTED_LABEL, splitFileName, splitForMiddleEllipsis, absolutePath, changeKindLabel, changesSummary, linesLabel, revertConfirmText, splitChangePath } from './changeFormat'

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
    expect(REVERTED_LABEL).toBe('Reverted. Restore from the Recycle Bin')
    expect(REVERTED_KIND).toBe('Reverted')
  })
})

describe('file names in the list (UX-79)', () => {
  it('keeps the extension apart so only the stem is cut', () => {
    expect(splitFileName('redirect.ts')).toEqual({ stem: 'redirect', ext: '.ts' })
    expect(splitFileName('a.test.ts')).toEqual({ stem: 'a.test', ext: '.ts' })
    expect(splitFileName('.gitignore')).toEqual({ stem: '.gitignore', ext: '' })
    expect(splitFileName('Makefile')).toEqual({ stem: 'Makefile', ext: '' })
  })
})

describe('cutting a name in the middle (UX-111)', () => {
  it('keeps the end of the stem and the extension together', () => {
    expect(splitForMiddleEllipsis('redirect-handler.ts')).toEqual({ head: 'redirect-h', tail: 'andler.ts' })
    expect(splitForMiddleEllipsis('a.test.ts')).toEqual({ head: '', tail: 'a.test.ts' })
    expect(splitForMiddleEllipsis('Makefile')).toEqual({ head: 'Ma', tail: 'kefile' })
    expect(splitForMiddleEllipsis('.gitignore')).toEqual({ head: '.git', tail: 'ignore' })
  })
  it('always gives back the whole name when the parts are joined', () => {
    for (const name of ['redirect.ts', 'x', 'README.md', 'archive.tar.gz']) {
      const { head, tail } = splitForMiddleEllipsis(name)
      expect(head + tail).toBe(name)
    }
  })
})
