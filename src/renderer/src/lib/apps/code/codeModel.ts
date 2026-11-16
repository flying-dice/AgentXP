/** Pure helpers of the Code app: tabs and the visible line range of the editor. */
import type { Id } from '@shared/models'

export interface TabState {
  tabs: string[]
  active: string | null
}

export function openTab(state: TabState, path: string): TabState {
  return { tabs: state.tabs.includes(path) ? state.tabs : [...state.tabs, path], active: path }
}

/** Closes a tab; the neighbour to the left (or right) becomes active when the active one closed. */
export function closeTab(state: TabState, path: string): TabState {
  const at = state.tabs.indexOf(path)
  if (at < 0) return state
  const tabs = state.tabs.filter((t) => t !== path)
  const active = state.active === path ? (tabs[Math.min(at, tabs.length) - 1] ?? tabs[0] ?? null) : state.active
  return { tabs, active }
}

/** Reconciles tabs and active file received from the agent: the active file is always a tab. */
export function reconcileTabs(tabs: readonly string[], active: string | null): TabState {
  const unique = [...new Set(tabs)]
  if (active && !unique.includes(active)) unique.push(active)
  return { tabs: unique, active: active ?? unique[0] ?? null }
}

/** 1-based first and last line that is at least partly visible. */
export function visibleRange(scrollTop: number, clientHeight: number, lineHeight: number, total: number): [number, number] {
  if (total <= 0 || lineHeight <= 0) return [1, 1]
  const first = Math.min(total, Math.floor(scrollTop / lineHeight) + 1)
  const last = Math.min(total, Math.max(first, Math.ceil((scrollTop + clientHeight) / lineHeight)))
  return [first, last]
}

/** scrollTop that puts `line` (1-based) a third of the way down the viewport. */
export function scrollTopForLine(line: number, clientHeight: number, lineHeight: number): number {
  return Math.max(0, (line - 1) * lineHeight - Math.floor(clientHeight / 3))
}

export const sameRange = (a: readonly [number, number] | null, b: readonly [number, number] | null): boolean =>
  a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1])

/** Which panes of the Code window are open: Management (left), Changes and Git (bottom) and the chat pane (right). */
export interface Panes {
  management: boolean
  logs: boolean
  chat: boolean
}

export const ALL_PANES: Panes = { management: true, logs: true, chat: true }
export const NO_PANES: Panes = { management: false, logs: false, chat: false }

/** The file has the whole window: no pane is open. */
export const isFocused = (panes: Panes): boolean => !panes.management && !panes.logs && !panes.chat

/**
 * "Focus on the file" and "Show panes" are one toggle. Focusing remembers the panes that were open and closes all of them;
 * showing brings back what was open (every pane when nothing is remembered).
 */
export function toggleFocus(current: Panes, remembered: Panes | null): { panes: Panes; remembered: Panes | null } {
  if (!isFocused(current)) return { panes: NO_PANES, remembered: { ...current } }
  return { panes: remembered && !isFocused(remembered) ? { ...remembered } : { ...ALL_PANES }, remembered: null }
}

/** What a Code window remembers about its panes (the chat pane remembers itself). */
export interface RememberedLayout {
  management: boolean
  logs: boolean
  restore: Panes | null
}

export const focusKey = (desktopId: Id, windowId: Id): string => `agent7.codepanes.${desktopId}.${windowId}`

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

/** Reads the remembered layout; anything unreadable (no storage, junk) is the default (both panes open). */
export function readLayout(storage: Pick<Storage, 'getItem'> | null, key: string): RememberedLayout {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? 'null')
    if (parsed && typeof parsed === 'object') {
      const { management, logs, restore } = parsed as Partial<RememberedLayout>
      const r = restore && typeof restore === 'object' ? (restore as Partial<Panes>) : null
      return {
        management: bool(management, true),
        logs: bool(logs, true),
        restore: r ? { management: bool(r.management, true), logs: bool(r.logs, true), chat: bool(r.chat, false) } : null
      }
    }
  } catch {
    /* blocked storage or junk: start from the default */
  }
  return { management: true, logs: true, restore: null }
}

/** Remembers the layout; storage that throws is ignored. */
export function writeLayout(storage: Pick<Storage, 'setItem'> | null, key: string, layout: RememberedLayout): void {
  try {
    storage?.setItem(key, JSON.stringify(layout))
  } catch {
    /* quota or blocked storage */
  }
}
