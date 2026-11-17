/** Pure helpers of the Kanban window: where a drop lands, what a card shows, who can be assigned. */
import type { AgentDto, Id } from '@shared/models'
import type { BoardDto, CardDto } from '@shared/kanban'
import type { ComboItem } from '../../kit/atoms/ComboBox'

/** The index a card dropped at pointer `y` takes among cards whose vertical centres are `mids` (top first). */
export const dropIndex = (mids: readonly number[], pointer: number): number => mids.filter((m) => m < pointer).length

/** Same for columns, by horizontal centres. */
export const columnDropIndex = dropIndex

/**
 * The index to give the service. `raw` counts the dragged item itself among `ids`; the service removes it first,
 * so a drop below its old place lands one earlier.
 */
export function targetIndex(ids: readonly Id[], dragged: Id, raw: number): number {
  const from = ids.indexOf(dragged)
  return from >= 0 && from < raw ? raw - 1 : raw
}

/** True when dropping `dragged` at `raw` would leave it where it is (no indicator, no call). */
export const isNoop = (ids: readonly Id[], dragged: Id, raw: number): boolean => {
  const from = ids.indexOf(dragged)
  return from >= 0 && (raw === from || raw === from + 1)
}

/** The first line of a description, cut to `max` characters. */
export function descriptionPreview(text: string, max = 90): string {
  const line = text.split('\n').find((l) => l.trim()) ?? ''
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line.trim()
}

/** The ASSIGNEE choices: the people and agent profiles of this project; the user can type any other name. */
export function assigneeItems(agents: readonly Pick<AgentDto, 'name'>[], used: readonly string[]): ComboItem[] {
  const names = new Set<string>(['Me'])
  for (const a of agents) names.add(a.name)
  for (const u of used) names.add(u)
  return [...names].map((value) => ({ value, label: value }))
}

export const assigneesOf = (board: BoardDto | null): string[] =>
  board ? [...new Set(board.columns.flatMap((c) => c.cards.map((k) => k.assignee).filter((a): a is string => !!a)))] : []

/** Two letters for the assignee badge ("Docs agent" -> "DA", "Claude" -> "CL"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  return (words.length === 1 ? words[0]!.slice(0, 2) : words[0]![0]! + words[1]![0]!).toUpperCase()
}

export const cardCount = (board: BoardDto | null): number => board?.columns.reduce((n, c) => n + c.cards.length, 0) ?? 0

export const cardLabel = (c: Pick<CardDto, 'title' | 'assignee'>): string => (c.assignee ? `${c.title}, assigned to ${c.assignee}` : c.title)
