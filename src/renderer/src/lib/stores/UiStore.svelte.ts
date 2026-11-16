import { defaultUiState, parseUiState, UI_STORAGE_KEY, type LeftTab, type PersistedUiState, type RightTab } from './uiState'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Window layout state (selected tabs, pane sizes, active session) persisted to localStorage, plus the status bar text. */
export class UiStore {
  leftTab = $state<LeftTab>('sessions')
  rightTab = $state<RightTab>('changes')
  leftWidth = $state(250)
  rightWidth = $state(330)
  activeSessionId = $state<number | null>(null)
  /** Collapsed nodes of the session tree. */
  collapsed = $state.raw<string[]>(defaultUiState().collapsed)
  /** Left text of the status strip. */
  status = $state('Ready')
  private readonly storage: Storage | null

  constructor(storage: Storage | null = browserStorage()) {
    this.storage = storage
    let text: string | null = null
    try {
      text = storage?.getItem(UI_STORAGE_KEY) ?? null
    } catch {
      text = null
    }
    const saved = parseUiState(text)
    this.leftTab = saved.leftTab
    this.rightTab = saved.rightTab
    this.leftWidth = saved.leftWidth
    this.rightWidth = saved.rightWidth
    this.activeSessionId = saved.activeSessionId
    this.collapsed = saved.collapsed
  }

  snapshot(): PersistedUiState {
    return {
      leftTab: this.leftTab,
      rightTab: this.rightTab,
      leftWidth: this.leftWidth,
      rightWidth: this.rightWidth,
      activeSessionId: this.activeSessionId,
      collapsed: this.collapsed
    }
  }

  save(): void {
    try {
      this.storage?.setItem(UI_STORAGE_KEY, JSON.stringify(this.snapshot()))
    } catch {
      /* storage unavailable or full: the layout simply is not remembered */
    }
  }

  /** Persists whenever a remembered value changes. Call inside a component (`$effect`). */
  persistEffect(): void {
    this.save()
  }

  setStatus(text: string): void {
    this.status = text
  }
}
