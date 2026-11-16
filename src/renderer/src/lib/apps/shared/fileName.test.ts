import { describe, expect, it } from 'vitest'
import { isValidFileName } from './fileName'

describe('isValidFileName', () => {
  it('accepts a plain name', () => {
    expect(isValidFileName(' notes.txt ')).toBe(true)
  })
  it('refuses an empty name and the characters Windows does not allow', () => {
    expect(isValidFileName('   ')).toBe(false)
    for (const bad of ['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b']) expect(isValidFileName(bad)).toBe(false)
  })
})
