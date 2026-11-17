import { describe, expect, it } from 'vitest'
import { assigneeItems, assigneesOf, cardCount, descriptionPreview, dropIndex, initials, isNoop, targetIndex } from './kanbanModel'

describe('drop positions', () => {
  it('counts the cards whose centre is above the pointer', () => {
    expect(dropIndex([10, 50, 90], 0)).toBe(0)
    expect(dropIndex([10, 50, 90], 60)).toBe(2)
    expect(dropIndex([10, 50, 90], 500)).toBe(3)
    expect(dropIndex([], 5)).toBe(0)
  })

  it('moves one earlier when the dragged card sits above the drop in the same column', () => {
    expect(targetIndex([1, 2, 3], 1, 3)).toBe(2)
    expect(targetIndex([1, 2, 3], 3, 0)).toBe(0)
    expect(targetIndex([1, 2, 3], 9, 2)).toBe(2)
  })

  it('knows a drop on its own place changes nothing', () => {
    expect(isNoop([1, 2, 3], 2, 1)).toBe(true)
    expect(isNoop([1, 2, 3], 2, 2)).toBe(true)
    expect(isNoop([1, 2, 3], 2, 0)).toBe(false)
    expect(isNoop([1, 2, 3], 9, 1)).toBe(false)
  })
})

describe('card text', () => {
  it('previews the first non-empty line', () => {
    expect(descriptionPreview('\n\n  hello \nworld')).toBe('hello')
    expect(descriptionPreview('x'.repeat(200), 10)).toBe('xxxxxxxxx…')
    expect(descriptionPreview('')).toBe('')
  })

  it('makes initials', () => {
    expect(initials('Docs agent')).toBe('DA')
    expect(initials('claude')).toBe('CL')
    expect(initials('  ')).toBe('')
  })
})

describe('assignees', () => {
  const board = { id: 1, desktopId: 1, name: 'b', columns: [{ id: 2, boardId: 1, name: 'c', cards: [{ id: 3, columnId: 2, title: 't', description: '', assignee: 'Zed' }, { id: 4, columnId: 2, title: 'u', description: '', assignee: null }] }] }
  it('offers Me, the agent profiles and names already on the board, once each', () => {
    expect(assigneesOf(board)).toEqual(['Zed'])
    expect(assigneeItems([{ name: 'Claude' }, { name: 'Zed' }], ['Zed']).map((i) => i.value)).toEqual(['Me', 'Claude', 'Zed'])
    expect(cardCount(board)).toBe(2)
    expect(cardCount(null)).toBe(0)
  })
})
