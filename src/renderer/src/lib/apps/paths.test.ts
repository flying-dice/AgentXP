import { describe, expect, it } from 'vitest'
import { baseName, extensionOf, joinPath, normalizePath, opensInNotepad, parentOf, parseAddress, toWindowsPath, typeName } from './paths'

describe('paths', () => {
  it('normalises separators and dot segments', () => {
    expect(normalizePath('\\src\\auth\\')).toBe('src/auth')
    expect(normalizePath('./src//auth/../index.ts')).toBe('src/index.ts')
    expect(normalizePath('')).toBe('')
  })

  it('splits and joins', () => {
    expect(baseName('src/auth/redirect.ts')).toBe('redirect.ts')
    expect(parentOf('src/auth/redirect.ts')).toBe('src/auth')
    expect(parentOf('src')).toBe('')
    expect(parentOf('')).toBe('')
    expect(joinPath('', 'a.txt')).toBe('a.txt')
    expect(joinPath('src', 'a.txt')).toBe('src/a.txt')
  })

  it('finds extensions', () => {
    expect(extensionOf('a/b/Readme.MD')).toBe('md')
    expect(extensionOf('.gitignore')).toBe('')
    expect(extensionOf('Makefile')).toBe('')
  })

  it('formats and parses addresses', () => {
    expect(toWindowsPath('src/auth')).toBe('W:\\src\\auth')
    expect(toWindowsPath('')).toBe('W:\\')
    expect(parseAddress('W:\\src\\auth')).toBe('src/auth')
    expect(parseAddress('w:/src')).toBe('src')
    expect(parseAddress('W:\\')).toBe('')
    expect(parseAddress('src/auth')).toBe('src/auth')
    expect(parseAddress('C:\\Windows')).toBeNull()
  })

  it('chooses the app for a file', () => {
    expect(opensInNotepad('README.md')).toBe(true)
    expect(opensInNotepad('test-output.log')).toBe(true)
    expect(opensInNotepad('src/index.ts')).toBe(false)
  })

  it('names file types', () => {
    expect(typeName('src', true)).toBe('File folder')
    expect(typeName('a.ts', false)).toBe('TypeScript file')
    expect(typeName('a.xyz', false)).toBe('XYZ file')
    expect(typeName('LICENSE', false)).toBe('File')
  })
})
