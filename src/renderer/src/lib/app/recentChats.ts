/** File > Open Recent of the Chat window: the latest chats of the desktop, like the recent files of an XP program. */
import type { Id, SessionDto } from '@shared/models'
import type { MenuItemDef } from '../kit/molecules/MenuItem'

/** How many chats the submenu lists (numbered 1 to 9, the keys of an XP recent-files list). */
export const RECENT_CHATS_MAX = 9

/** The label of a recent chat: its number as the mnemonic, then the title ("&1 Fix the login form"). */
export function recentChatLabel(index: number, title: string): string {
  return `&${index + 1} ${(title || 'New chat').replace(/&/g, '&&')}`
}

/**
 * The items of File > Open Recent: the chats of the desktop other than `currentId`, latest activity first, then "All
 * chats..." (Task Manager on Chats). A desktop with no other chat shows one dimmed line instead.
 */
export function recentChatItems(
  chats: readonly Pick<SessionDto, 'id' | 'title' | 'updatedAt' | 'role'>[],
  currentId: Id,
  open: (id: Id) => void,
  showAll: () => void
): MenuItemDef[] {
  const recent = chats
    .filter((c) => c.role === 'chat' && c.id !== currentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)
    .slice(0, RECENT_CHATS_MAX)
  const items: MenuItemDef[] = recent.length
    ? recent.map((c, i) => ({ id: `chat-recent-${c.id}`, testid: 'chat-menu-recent-item', label: recentChatLabel(i, c.title), title: `Open "${c.title || 'New chat'}" again with its history`, action: () => open(c.id) }))
    : [{ id: 'chat-recent-none', testid: 'chat-menu-recent-none', label: '(No other chats)', disabled: true }]
  return [...items, { separator: true }, { id: 'chat-recent-all', testid: 'chat-menu-recent-all', label: '&All chats...', title: 'Open Task Manager on Chats: every chat of this desktop', action: showAll }]
}
