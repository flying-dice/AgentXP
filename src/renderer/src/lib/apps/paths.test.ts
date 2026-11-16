import { describe, expect, it } from 'vitest'
import { extensionOf, opensInNotepad, typeName } from './paths'

describe('paths', () => {
  it('reads the extension of the last segment', () => {
    expect(extensionOf('E:\\src\\Index.TS')).toBe('ts')
    expect(extensionOf('E:\\src\\.gitignore')).toBe('')
    expect(extensionOf('E:\\')).toBe('')
  })
  it('sends text files to Notepad and the rest to Code', () => {
    expect(opensInNotepad('C:\\Users\\Agent\\Documents\\notes.txt')).toBe(true)
    expect(opensInNotepad('E:\\README.md')).toBe(true)
    expect(opensInNotepad('E:\\src\\index.ts')).toBe(false)
  })
  it('names types', () => {
    expect(typeName('E:\\src', true)).toBe('File folder')
    expect(typeName('E:\\a.svelte', false)).toBe('Svelte component')
    expect(typeName('E:\\a.xyz', false)).toBe('XYZ file')
    expect(typeName('E:\\Makefile', false)).toBe('File')
  })
})
