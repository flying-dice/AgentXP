/** Pure helpers of the Code app: tabs and the visible line range of the editor. */

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
