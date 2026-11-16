import { describe, expect, it } from 'vitest'
import { chapterOf, collapsedLines, scrollTopFor, tailPadding } from './contents'

describe('Help contents (UX-132)', () => {
  it('finds the chapter of a heading', () => {
    const headings = [
      { tag: 'H2', id: 'table-of-contents' },
      { tag: 'H2', id: '3-the-window' },
      { tag: 'H3', id: 'the-bar' },
      { tag: 'H2', id: '5-common-tasks' },
      { tag: 'H3', id: 'undo' }
    ]
    expect(chapterOf(headings, '3-the-window')).toBe('3-the-window')
    expect(chapterOf(headings, 'undo')).toBe('5-common-tasks')
    expect(chapterOf(headings, 'missing')).toBeNull()
  })

  it('leaves 24 px above a heading, so no text above it is cut (UX-183, UX-205)', () => {
    expect(scrollTopFor(1000)).toBe(976)
    expect(scrollTopFor(5)).toBe(0)
  })

  it('adds room at the end when a heading near it could not reach the top (UX-205)', () => {
    expect(tailPadding(900, 1200, 400)).toBe(76)
    expect(tailPadding(100, 1200, 400)).toBe(0)
    expect(tailPadding(900, 1276, 400, 76)).toBe(76)
  })

  it('keeps the sections of the current chapter only', () => {
    const lines = [
      { id: '1-one', hasSections: false },
      { id: '3-the-window', hasSections: true },
      { id: '5-common-tasks', hasSections: true }
    ]
    expect(collapsedLines(lines, '5-common-tasks')).toEqual([false, true, false])
    expect(collapsedLines(lines, null)).toEqual([false, true, true])
  })
})
