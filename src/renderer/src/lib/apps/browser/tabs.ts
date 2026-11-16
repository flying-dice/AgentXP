/** Tab strip state of the Browser app: pure helpers, so the rules are tested without a browser. */
import { BLANK, hostOf } from './address'

export interface BrowserTabState {
  id: number
  url: string
  title: string
  loading: boolean
  canBack: boolean
  canForward: boolean
  /** The page did not load (the error page is showing). */
  failed: boolean
  /** Page zoom as a factor (1 = 100%). */
  zoom: number
}

export const newTabState = (id: number, url: string = BLANK): BrowserTabState => ({ id, url, title: '', loading: false, canBack: false, canForward: false, failed: false, zoom: 1 })

/** What the tab strip shows for a tab. */
export const tabLabel = (tab: Pick<BrowserTabState, 'url' | 'title'>): string => tab.title || (tab.url === BLANK || !tab.url ? 'New Tab' : hostOf(tab.url))

export interface TabsAfterClose {
  tabs: BrowserTabState[]
  activeId: number
  /** True when the last tab was closed: it is replaced by one blank tab (a window always has a tab). */
  replaced: boolean
}

/** Closing a tab activates its right neighbour, else the left one. The last tab is replaced by a blank one. */
export function closeTab(tabs: readonly BrowserTabState[], activeId: number, id: number, nextId: number): TabsAfterClose {
  const index = tabs.findIndex((t) => t.id === id)
  if (index < 0) return { tabs: [...tabs], activeId, replaced: false }
  if (tabs.length === 1) return { tabs: [newTabState(nextId)], activeId: nextId, replaced: true }
  const rest = tabs.filter((t) => t.id !== id)
  if (id !== activeId) return { tabs: rest, activeId, replaced: false }
  return { tabs: rest, activeId: (rest[index] ?? rest[index - 1]).id, replaced: false }
}

/** The tab list as the agent's `browser_tabs` shows it. */
export const tabInfos = (tabs: readonly BrowserTabState[], activeId: number): { id: number; title: string; url: string; active: boolean }[] =>
  tabs.map((t) => ({ id: t.id, title: tabLabel(t), url: t.url, active: t.id === activeId }))

export type TabsAction = 'list' | 'new' | 'switch' | 'close'

export interface TabsRequest {
  action: TabsAction
  url?: string
  tab?: number
}

/** Reads the params of a `tabs` app request. Throws a readable message for nonsense. */
export function parseTabsRequest(params: unknown): TabsRequest {
  const p = (params ?? {}) as { action?: unknown; url?: unknown; tab?: unknown }
  if (p.action !== 'list' && p.action !== 'new' && p.action !== 'switch' && p.action !== 'close') throw new Error('Unknown tabs action. Use list, new, switch or close.')
  return { action: p.action, url: typeof p.url === 'string' && p.url ? p.url : undefined, tab: typeof p.tab === 'number' ? p.tab : undefined }
}
