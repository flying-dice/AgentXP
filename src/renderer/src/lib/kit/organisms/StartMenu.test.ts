import { describe, expect, it } from 'vitest'
import { filterStartItems, moveHighlight, START_MENU_HINT, startNavItems } from './StartMenu'

const items = [
  { id: 'chat', title: 'Chat', description: 'Talk to the agent' },
  { id: 'explorer', title: 'Explorer', description: 'Browse files' },
  { id: 'browser', title: 'Browser' }
]

describe('filterStartItems', () => {
  it('returns everything for an empty query', () => {
    expect(filterStartItems(items, '  ')).toHaveLength(3)
  })
  it('matches title and description, case-insensitively', () => {
    expect(filterStartItems(items, 'EXPL').map((i) => i.id)).toEqual(['explorer'])
    expect(filterStartItems(items, 'agent').map((i) => i.id)).toEqual(['chat'])
  })
  it('requires every word', () => {
    expect(filterStartItems(items, 'browse files').map((i) => i.id)).toEqual(['explorer'])
    expect(filterStartItems(items, 'chat files')).toEqual([])
  })
})

describe('keyboard reach of the Start menu', () => {
  const groups = [{ id: 'accessories', title: 'Accessories', items: [{ id: 'notepad', title: 'Notepad' }] }]
  const recent = [{ id: '7', title: 'Fix login' }]

  it('lists programs, the programs of open folders, then recent chats', () => {
    const closed = startNavItems({ programs: items, groups, recent, openGroups: {}, searching: false })
    expect(closed.map((n) => n.key)).toEqual(['p:chat', 'p:explorer', 'p:browser', 'r:7'])
    const open = startNavItems({ programs: items, groups, recent, openGroups: { accessories: true }, searching: false })
    expect(open.map((n) => n.key)).toEqual(['p:chat', 'p:explorer', 'p:browser', 'g:accessories:notepad', 'r:7'])
  })

  it('reaches the matches of every folder while searching, and tells apps from chats', () => {
    const found = startNavItems({ programs: [], groups, recent, openGroups: {}, searching: true })
    expect(found).toEqual([
      { key: 'g:accessories:notepad', kind: 'run', id: 'notepad' },
      { key: 'r:7', kind: 'recent', id: '7' }
    ])
  })

  it('moves the highlight with Up and Down and wraps around', () => {
    expect(moveHighlight(0, 3, 1)).toBe(1)
    expect(moveHighlight(2, 3, 1)).toBe(0)
    expect(moveHighlight(0, 3, -1)).toBe(2)
    expect(moveHighlight(0, 0, 1)).toBe(0)
  })

  it('names the three shell keys in the footer', () => {
    expect(START_MENU_HINT).toBe('Ctrl+Esc opens this menu. Ctrl+N starts a new chat. F6 moves between the desktop, windows and the taskbar.')
  })
})
