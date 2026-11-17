import { describe, expect, it, vi } from 'vitest'
import { RECENT_CHATS_MAX, recentChatItems, recentChatLabel } from './recentChats'

const chat = (id: number, title: string, updatedAt: string, role: 'chat' | 'aside' | 'review' = 'chat') => ({ id, title, updatedAt, role })

describe('recentChatItems', () => {
  it('lists the other chats, latest first, numbered, then All chats', () => {
    const open = vi.fn()
    const items = recentChatItems([chat(1, 'old', '2026-01-01'), chat(2, 'this', '2026-01-03'), chat(3, 'new', '2026-01-02')], 2, open, () => {})
    expect(items.map((i) => i.label ?? '-')).toEqual(['&1 new', '&2 old', '-', '&All chats...'])
    items[1]!.action!()
    expect(open).toHaveBeenCalledWith(1)
  })

  it('leaves out pane chats and review sessions', () => {
    const items = recentChatItems([chat(1, 'pane', '2026-01-01', 'aside'), chat(2, 'review', '2026-01-01', 'review')], 0, () => {}, () => {})
    expect(items[0]).toMatchObject({ label: '(No other chats)', disabled: true })
  })

  it('stops at nine chats', () => {
    const many = Array.from({ length: 15 }, (_, i) => chat(i + 1, `c${i + 1}`, `2026-01-${String(i + 1).padStart(2, '0')}`))
    const items = recentChatItems(many, 0, () => {}, () => {})
    expect(items.filter((i) => i.testid === 'chat-menu-recent-item')).toHaveLength(RECENT_CHATS_MAX)
    expect(items[0]!.label).toBe('&1 c15')
  })

  it('escapes ampersands and names untitled chats', () => {
    expect(recentChatLabel(0, 'Tom & Jerry')).toBe('&1 Tom && Jerry')
    expect(recentChatLabel(2, '')).toBe('&3 New chat')
  })
})
