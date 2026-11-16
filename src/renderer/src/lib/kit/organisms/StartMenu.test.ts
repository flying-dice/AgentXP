import { describe, expect, it } from 'vitest'
import { filterStartItems } from './StartMenu'

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
