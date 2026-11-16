/**
 * The chat pane every app window can host (manuals/embedded-chat.md): pure helpers of the shell.
 * Which apps have one, what the pane remembers per window, the app context that rides with a prompt and the
 * suggestion chips of the compact panel.
 */
import type { AppKind } from '@shared/desktop'
import type { Id } from '@shared/models'

export const PANE_DEFAULT_WIDTH = 340
export const PANE_MIN_WIDTH = 260
export const PANE_MAX_WIDTH = 720

/** What the shell remembers of a window's chat pane. A new window starts collapsed. */
export interface PaneState {
  collapsed: boolean
  width: number
}

export const DEFAULT_PANE: PaneState = { collapsed: true, width: PANE_DEFAULT_WIDTH }

export const paneKey = (desktopId: Id, windowId: Id): string => `agent7.chatpane.${desktopId}.${windowId}`

const clampWidth = (width: number): number => Math.min(PANE_MAX_WIDTH, Math.max(PANE_MIN_WIDTH, Math.round(width)))

/** Reads the remembered state; anything unreadable (no storage, private window, junk) is the default. */
export function readPane(storage: Pick<Storage, 'getItem'> | null, key: string): PaneState {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? 'null')
    if (parsed && typeof parsed === 'object') {
      const { collapsed, width } = parsed as Partial<PaneState>
      return { collapsed: typeof collapsed === 'boolean' ? collapsed : true, width: typeof width === 'number' && Number.isFinite(width) ? clampWidth(width) : PANE_DEFAULT_WIDTH }
    }
  } catch {
    /* blocked storage or junk: start from the default */
  }
  return { ...DEFAULT_PANE }
}

/** Remembers the state; storage that throws is ignored (the pane is then only remembered for this session). */
export function writePane(storage: Pick<Storage, 'setItem'> | null, key: string, state: PaneState): void {
  try {
    storage?.setItem(key, JSON.stringify({ collapsed: state.collapsed, width: clampWidth(state.width) }))
  } catch {
    /* quota or blocked storage */
  }
}

/** The browser's localStorage, or null when even touching it throws. */
export function localStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** The app context of one window as the agent gets it: who is asking, plus whatever the app registered. */
export function composeAppContext(window: { id: Id; app: AppKind; title: string }, provided: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return { windowId: window.id, app: window.app, title: window.title, ...(provided ?? {}) }
}

/** A suggestion chip: `label` is what the chip says, `text` what it sends. */
export interface Suggestion {
  id: string
  label: string
  text: string
}

const has = (value: unknown): boolean => (Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : value != null && value !== false)

const chip = (id: string, label: string, text = label): Suggestion => ({ id, label, text })

/** Two or three chips for the short exchanges of the compact pane, picked from what the app's context holds. */
export function suggestionsFor(app: AppKind, context: Record<string, unknown> | null | undefined): Suggestion[] {
  const c = context ?? {}
  const selection = has(c['selection'])
  switch (app) {
    case 'code': {
      return [
        has(c['openFile']) || selection ? chip('explain', 'Explain this') : chip('explain', 'What can I do here?'),
        ...(has(c['openFile']) ? [chip('changed', 'What changed in this file?')] : []),
        ...(has(c['openFile']) ? [chip('bugs', 'Any bugs here?')] : [])
      ]
    }
    case 'notepad':
    case 'wordpad':
      return [chip('explain', 'Explain this'), chip('summarise', selection ? 'Summarise the selection' : 'Summarise this'), chip('proofread', 'Fix typos')]
    case 'explorer':
      return has(c['selectedItems']) ? [chip('explain', 'Explain this'), chip('find', 'Which of these changed?')] : [chip('folder', 'What is in this folder?'), chip('find', 'Where is the main code?')]
    case 'terminal':
      return [chip('explain', 'Explain this output'), chip('failed', 'Why did it fail?')]
    case 'browser':
      return [chip('summarise', 'Summarise this page'), ...(selection ? [chip('explain', 'Explain this')] : [chip('links', 'What are the main links?')])]
    case 'event-viewer':
      return has(c['selectedRow']) ? [chip('explain', 'Explain this event')] : [chip('errors', 'Any errors in these events?')]
    case 'agent-manager':
      return [chip('context', 'Which chat uses the most context?')]
    case 'recycle-bin':
      return [chip('reverted', 'What did I revert?')]
    case 'paint':
      return [chip('describe', 'Describe the canvas'), chip('draw', 'Draw something simple')]
    case 'sticky-notes':
      return [chip('summarise', 'Summarise my notes')]
    case 'help':
      return [chip('explain', 'Explain this topic')]
    default:
      return [chip('explain', 'What can I do here?')]
  }
}
