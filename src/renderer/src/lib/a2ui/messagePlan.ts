import type { A2uiServerMessage } from '@shared/a2ui'

export type SyncPlan =
  | { kind: 'apply'; messages: A2uiServerMessage[] }
  | { kind: 'rebuild' }

const kindOf = (message: A2uiServerMessage): string => Object.keys(message).find((k) => k !== 'version') ?? ''
const isUpsert = (message: A2uiServerMessage): boolean => ['updateComponents', 'updateDataModel'].includes(kindOf(message))

/** Structural equality of two JSON messages (key order does not matter). */
export function sameMessage(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => k in b && sameMessage((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/**
 * How to get from the messages already applied to the new replay of a surface.
 *
 * Snapshots replay a whole surface, so most of the time the head is identical: only the tail is
 * applied, which keeps the data model the user edited locally. A same-length list whose changed
 * entries are updateComponents / updateDataModel is applied in place; anything else (a changed
 * createSurface, a shorter list, a deleted surface) rebuilds the surface from scratch.
 */
export function planSync(applied: readonly A2uiServerMessage[], next: readonly A2uiServerMessage[]): SyncPlan {
  let common = 0
  while (common < applied.length && common < next.length && sameMessage(applied[common], next[common])) common++
  if (common === applied.length) return { kind: 'apply', messages: next.slice(common) }
  const patchable = applied.length === next.length && applied.slice(common).every(isUpsert) && next.slice(common).every(isUpsert)
  if (!patchable) return { kind: 'rebuild' }
  const changed = next.slice(common).filter((m, i) => !sameMessage(m, applied[common + i]))
  return { kind: 'apply', messages: changed }
}
