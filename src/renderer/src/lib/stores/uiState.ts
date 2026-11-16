export type LeftTab = 'sessions' | 'files'
export type RightTab = 'changes' | 'tasks' | 'properties'

/** What the window remembers between runs. */
export interface PersistedUiState {
  leftTab: LeftTab
  rightTab: RightTab
  leftWidth: number
  rightWidth: number
  activeSessionId: number | null
  /** Collapsed nodes of the session tree (everything else is expanded). */
  collapsed: string[]
}

export const UI_STORAGE_KEY = 'agent7.ui'

export const defaultUiState = (): PersistedUiState => ({
  leftTab: 'sessions',
  rightTab: 'changes',
  leftWidth: 250,
  rightWidth: 330,
  activeSessionId: null,
  collapsed: []
})

const clampWidth = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(120, Math.min(900, Math.round(value))) : fallback

/** Reads saved state defensively; anything malformed falls back to the default. */
export function parseUiState(text: string | null): PersistedUiState {
  const base = defaultUiState()
  if (!text) return base
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return base
  }
  if (typeof raw !== 'object' || raw === null) return base
  const r = raw as Record<string, unknown>
  return {
    leftTab: r.leftTab === 'files' ? 'files' : 'sessions',
    rightTab: r.rightTab === 'tasks' || r.rightTab === 'properties' ? r.rightTab : 'changes',
    leftWidth: clampWidth(r.leftWidth, base.leftWidth),
    rightWidth: clampWidth(r.rightWidth, base.rightWidth),
    activeSessionId: typeof r.activeSessionId === 'number' ? r.activeSessionId : null,
    collapsed: Array.isArray(r.collapsed) ? r.collapsed.filter((e): e is string => typeof e === 'string') : base.collapsed
  }
}
