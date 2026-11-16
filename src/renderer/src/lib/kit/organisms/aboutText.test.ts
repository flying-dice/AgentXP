import { describe, expect, it } from 'vitest'
import { aboutLine } from './aboutText'

describe('aboutLine (UX-192)', () => {
  it('names the program and then the version of Agent7', () => {
    expect(aboutLine('Notepad', '0.1.0')).toBe('Notepad, part of Agent7. Agent7 version 0.1.0.')
  })
  it('leaves the version out until it is loaded', () => {
    expect(aboutLine('Notepad')).toBe('Notepad, part of Agent7.')
  })
})
