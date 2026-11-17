import { describe, expect, it } from 'vitest'
import { describeBoard, reorder } from './kanban'

describe('reorder', () => {
  it('moves an id to an index, clamps, and defaults to the end', () => {
    expect(reorder([1, 2, 3], 3, 0)).toEqual([3, 1, 2])
    expect(reorder([1, 2, 3], 1)).toEqual([2, 3, 1])
    expect(reorder([1, 2, 3], 1, 1)).toEqual([2, 1, 3])
    expect(reorder([1, 2, 3], 2, 99)).toEqual([1, 3, 2])
    expect(reorder([1, 2, 3], 2, -5)).toEqual([2, 1, 3])
    expect(reorder([1, 2], 9, 1)).toEqual([1, 9, 2])
  })
})

describe('describeBoard', () => {
  it('lists ids, assignees and indented descriptions', () => {
    const text = describeBoard({
      id: 1, desktopId: 1, name: 'B',
      columns: [{ id: 2, boardId: 1, name: 'To do', cards: [{ id: 3, columnId: 2, title: 'T', description: 'a\nb', assignee: 'Ann' }] }, { id: 4, boardId: 1, name: 'Done', cards: [] }]
    })
    expect(text).toBe('Board [1] B\n  Column [2] To do (1)\n    Card [3] T (assignee: Ann)\n      a\n      b\n  Column [4] Done (0)')
  })
})
