import { describe, expect, it } from 'vitest'
import { formatVPath, joinVPath, nextDriveLetter, noDriveMessage, normaliseVPath, parseVPath, vpathName, vpathParent } from './vfs'

describe('parseVPath / normaliseVPath', () => {
  it('upper-cases the drive, uses backslashes and keeps the root slash', () => {
    expect(normaliseVPath('c:/Users/Agent/')).toBe('C:\\Users\\Agent')
    expect(normaliseVPath('E:')).toBe('E:\\')
    expect(normaliseVPath('e:\\')).toBe('E:\\')
    expect(parseVPath('E:\\src\\a.ts')).toEqual({ drive: 'E', segments: ['src', 'a.ts'] })
  })

  it('collapses . .. and repeated separators', () => {
    expect(normaliseVPath('E:\\a\\.\\b\\..\\c')).toBe('E:\\a\\c')
    expect(normaliseVPath('E:\\\\a//b')).toBe('E:\\a\\b')
  })

  it('refuses relative paths, escapes above the drive root and illegal characters', () => {
    expect(parseVPath('src\\a.ts')).toBeNull()
    expect(parseVPath('/etc/passwd')).toBeNull()
    expect(parseVPath('E:\\..')).toBeNull()
    expect(parseVPath('E:\\a\\..\\..\\b')).toBeNull()
    expect(parseVPath('E:\\a:b')).toBeNull()
    expect(parseVPath('')).toBeNull()
  })
})

describe('join / parent / name', () => {
  it('joins and normalises', () => {
    expect(joinVPath('E:\\', 'src', 'a.ts')).toBe('E:\\src\\a.ts')
    expect(joinVPath('E:\\src', '..', 'x')).toBe('E:\\x')
    expect(joinVPath('E:\\src', '..', '..')).toBeNull()
  })

  it('gives the parent; a drive root has none', () => {
    expect(vpathParent('E:\\src\\a.ts')).toBe('E:\\src')
    expect(vpathParent('E:\\src')).toBe('E:\\')
    expect(vpathParent('E:\\')).toBeNull()
  })

  it('names the last segment, or the drive for a root', () => {
    expect(vpathName('E:\\src\\a.ts')).toBe('a.ts')
    expect(vpathName('C:\\')).toBe('C:')
  })

  it('formats a parsed path', () => {
    expect(formatVPath({ drive: 'F', segments: [] })).toBe('F:\\')
  })
})

describe('nextDriveLetter / noDriveMessage', () => {
  it('starts at E and skips used letters (case-insensitive)', () => {
    expect(nextDriveLetter([])).toBe('E')
    expect(nextDriveLetter(['E', 'f'])).toBe('G')
    expect(nextDriveLetter(['C'])).toBe('E')
  })

  it('returns null when E..Z are taken', () => {
    const all = Array.from({ length: 22 }, (_, i) => String.fromCharCode(69 + i))
    expect(nextDriveLetter(all)).toBeNull()
  })

  it('tells the agent which drive is gone', () => {
    expect(noDriveMessage('E')).toContain('Drive E:')
  })
})
