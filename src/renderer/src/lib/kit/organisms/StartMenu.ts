export interface StartItem {
  id: string
  title: string
  description?: string
  icon?: import('../atoms/icons').IconName
}

/** Start menu search: items whose title or description contain every word of the query (case-insensitive). */
export function filterStartItems<T extends { title: string; description?: string }>(items: readonly T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...items]
  return items.filter((item) => {
    const hay = `${item.title} ${item.description ?? ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** A folder in the left column ("Accessories"): collapsed by default, expands in place. */
export interface StartGroup {
  id: string
  title: string
  icon?: import('../atoms/icons').IconName
  items: StartItem[]
}

/** Footer of the Start menu: the three keys that reach the shell. */
export const START_MENU_HINT = 'Ctrl+Esc opens this menu. Ctrl+N starts a new chat. F6 moves between the desktop, windows and the taskbar.'

/** One entry the arrow keys can reach: an app (`run`) or a recent chat (`recent`). */
export interface StartNavItem {
  key: string
  kind: 'run' | 'recent'
  id: string
}

/** The entries Up, Down and Enter reach, top to bottom: programs, the open folders' programs, then recent chats. */
export function startNavItems(input: { programs: readonly StartItem[]; groups: readonly StartGroup[]; recent: readonly StartItem[]; openGroups: Readonly<Record<string, boolean>>; searching: boolean }): StartNavItem[] {
  const run = (key: string, item: StartItem): StartNavItem => ({ key, kind: 'run', id: item.id })
  return [
    ...input.programs.map((i) => run(`p:${i.id}`, i)),
    ...input.groups.flatMap((g) => (input.searching || input.openGroups[g.id] ? g.items.map((i) => run(`g:${g.id}:${i.id}`, i)) : [])),
    ...input.recent.map((i): StartNavItem => ({ key: `r:${i.id}`, kind: 'recent', id: i.id }))
  ]
}

/** The highlighted entry after Up (-1) or Down (1); it wraps around. */
export const moveHighlight = (current: number, count: number, step: 1 | -1): number => (count === 0 ? 0 : (current + step + count) % count)
