import { describe, expect, it } from 'vitest'
import { findNext } from './find'

describe('findNext', () => {
  it('finds the first match at or after the offset', () => {
    expect(findNext('one two one', 'one', 1, false)).toBe(8)
  })
  it('goes on from the top when there is no match below', () => {
    expect(findNext('one two one', 'one', 9, false)).toBe(0)
  })
  it('ignores case unless asked', () => {
    expect(findNext('Hello', 'hello', 0, false)).toBe(0)
    expect(findNext('Hello', 'hello', 0, true)).toBe(-1)
  })
  it('returns -1 for an empty query', () => {
    expect(findNext('abc', '', 0, false)).toBe(-1)
  })
})
