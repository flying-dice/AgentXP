import { describe, expect, it } from 'vitest'
import { caretPosition, offsetOfLine } from './caret'

describe('caret', () => {
  const text = 'one\ntwo\n\nfour'
  it('finds line and column', () => {
    expect(caretPosition(text, 0)).toEqual({ line: 1, col: 1 })
    expect(caretPosition(text, 3)).toEqual({ line: 1, col: 4 })
    expect(caretPosition(text, 4)).toEqual({ line: 2, col: 1 })
    expect(caretPosition(text, 9)).toEqual({ line: 4, col: 1 })
    expect(caretPosition(text, 999)).toEqual({ line: 4, col: 5 })
  })

  it('finds the offset of a line', () => {
    expect(offsetOfLine(text, 1)).toBe(0)
    expect(offsetOfLine(text, 2)).toBe(4)
    expect(offsetOfLine(text, 4)).toBe(9)
    expect(offsetOfLine(text, 99)).toBe(text.length)
  })
})
