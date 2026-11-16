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
