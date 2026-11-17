import { describe, expect, it, vi } from 'vitest'
import type { KanbanApi } from '@shared/kanban'
import { submission, type KanbanDialog } from './dialogSubmit'

const api = () => {
  const calls: unknown[][] = []
  const rec = (name: string) => async (...args: unknown[]) => void calls.push([name, ...args])
  return {
    calls,
    api: Object.fromEntries(['createBoard', 'renameBoard', 'addColumn', 'renameColumn', 'addCard', 'updateCard'].map((n) => [n, rec(n)])) as unknown as KanbanApi
  }
}
const ctx = { desktopId: 1, boardId: 7 }
const card = { title: 'T', description: 'd', assignee: null }

describe('Kanban dialog submissions', () => {
  it('survive the dialog being cleared before the call runs (regression: reading columnId of null)', async () => {
    let dialog: KanbanDialog | null = { kind: 'new-card', columnId: 42 }
    const make = submission(dialog, card, ctx)!
    dialog = null // the window clears its state on OK, before the call is made
    const { api: fake, calls } = api()
    await make(fake)
    expect(dialog).toBeNull()
    expect(calls).toEqual([['addCard', 42, card]])
  })

  it('builds every call from the snapshot', async () => {
    const { api: fake, calls } = api()
    const column = { id: 5, boardId: 7, name: 'Doing', cards: [] }
    const edited = { id: 9, columnId: 5, title: 'x', description: '', assignee: 'Ann' }
    await submission({ kind: 'new-board' }, 'B', ctx)!(fake)
    await submission({ kind: 'rename-board' }, 'B2', ctx)!(fake)
    await submission({ kind: 'new-column' }, 'L', ctx)!(fake)
    await submission({ kind: 'rename-column', column }, 'L2', ctx)!(fake)
    await submission({ kind: 'edit-card', card: edited }, { title: 'y', description: 'z', assignee: null }, ctx)!(fake)
    expect(calls).toEqual([
      ['createBoard', 1, 'B'],
      ['renameBoard', 7, 'B2'],
      ['addColumn', 7, 'L'],
      ['renameColumn', 5, 'L2'],
      ['updateCard', 9, { title: 'y', description: 'z', assignee: '' }]
    ])
  })

  it('does nothing for a list or a rename without a board, or for the wrong kind of input', () => {
    const none = { desktopId: 1, boardId: null }
    expect(submission({ kind: 'new-column' }, 'L', none)).toBeNull()
    expect(submission({ kind: 'rename-board' }, 'B', none)).toBeNull()
    expect(submission({ kind: 'new-card', columnId: 1 }, 'name', ctx)).toBeNull()
    expect(submission({ kind: 'new-board' }, card, ctx)).toBeNull()
    expect(vi.fn()).not.toHaveBeenCalled()
  })
})
