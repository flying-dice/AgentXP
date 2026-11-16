import { describe, expect, it } from 'vitest'
import { chapterOf, collapsedLines, scrollTopFor } from './contents'

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

  it('puts a heading in the top third of the box, never further than 120 px down', () => {
    expect(scrollTopFor(1000, 300)).toBe(900)
    expect(scrollTopFor(1000, 900)).toBe(880)
    expect(scrollTopFor(50, 600)).toBe(0)
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
