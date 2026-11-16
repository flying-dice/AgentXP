import { describe, expect, it } from 'vitest'
import { isValidFileName, shortenMiddle } from './fileName'

describe('isValidFileName', () => {
  it('accepts a plain name', () => {
    expect(isValidFileName(' notes.txt ')).toBe(true)
  })
  it('refuses an empty name and the characters Windows does not allow', () => {
    expect(isValidFileName('   ')).toBe(false)
    for (const bad of ['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b']) expect(isValidFileName(bad)).toBe(false)
  })
})

describe('shortenMiddle', () => {
  it('keeps a short text and cuts a long one in the middle, not at the end', () => {
    expect(shortenMiddle('C:/short', 20)).toBe('C:/short')
    const cut = shortenMiddle('/home/anna/projects/web/login-app', 20)
    expect(cut).toHaveLength(20)
    expect(cut.startsWith('/home/')).toBe(true)
    expect(cut.endsWith('login-app')).toBe(true)
    expect(cut).toContain('...')
  })
})
