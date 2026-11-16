import type { IconName } from '../atoms/icons'
import type { SortDirection } from '../molecules/ColumnHeader'

export type ListViewMode = 'Details' | 'List' | 'SmallIcon' | 'LargeIcon'

export interface ListColumn {
  key: string
  header: string
  /** px; omitted = flexible. */
  width?: number
  align?: 'left' | 'right' | 'center'
  /** Default true. */
  sortable?: boolean
  /** px; the narrowest a flexible column (no `width`) counts for when the list decides to scroll sideways. Default 80. */
  minWidth?: number
}

export interface ListRow {
  id: string
  icon?: IconName
  [key: string]: unknown
}

export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRows(rows: ListRow[], key: string, direction: SortDirection): ListRow[] {
  if (!key || direction === 'none') return rows
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => sign * compareValues(a[key], b[key]))
}

/** Ids between two indexes, inclusive. */
export function rangeIds(rows: ListRow[], from: number, to: number): string[] {
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  return rows.slice(lo, hi + 1).map((r) => r.id)
}
