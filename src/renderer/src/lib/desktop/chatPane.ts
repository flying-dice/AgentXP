/**
 * The chat pane every app window can host (manuals/embedded-chat.md): pure helpers of the shell.
 * Which apps have one, what the pane remembers per window, the app context that rides with a prompt and the
 * suggestion chips of the compact panel.
 */
import type { AppKind, AskChatRequest } from '@shared/desktop'
import { askChatPrompt } from '../apps/askChat'
import { SELECT_FIRST_TIP, type ChatSuggestion } from '../app/session/chatPaneText'
import type { Id } from '@shared/models'

/** A new chat pane is 420 px wide (the window keeps it under 60% of its width), so a question and its answer do not wrap at every word (UX-126). */
export const PANE_DEFAULT_WIDTH = 420
export const PANE_MIN_WIDTH = 260
export const PANE_MAX_WIDTH = 720
/**
 * The app keeps at least this much width when the pane opens (UX-198: a page squeezed beside the pane is unreadable).
 * 380 leaves an 800 px window its 420 px pane (UX-126); narrower pages switch to their stacked layout (Control Center below 640 px).
 */
export const APP_MIN_WIDTH = 380

/** The widest the pane can be in a window whose client area is `available` wide: 60 % of it, and never so wide that the app has under 380 px. */
export const paneMaxWidth = (available: number): number => Math.max(PANE_MIN_WIDTH, Math.min(Math.floor(available * 0.6), available - APP_MIN_WIDTH))

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

export type Suggestion = ChatSuggestion

const has = (value: unknown): boolean => (Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : value != null && value !== false)

const chip = (id: string, label: string, text = label): Suggestion => ({ id, label, text })

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * The request behind the chip "Explain this": the same request the right-click route sends, built from what the app
 * registered (the selection and its lines, the open file, the page, the selected items). Null while nothing is selected.
 */
export function explainRequest(app: AppKind, windowId: number, context: Record<string, unknown> | null | undefined): AskChatRequest | null {
  const c = context ?? {}
  const selection = textOf(c['selection'])
  const range = c['range'] as AskChatRequest['range']
  const path = textOf(c['openFile'])
  if (app === 'explorer') {
    const item = Array.isArray(c['selectedItems']) ? textOf(c['selectedItems'][0]) : ''
    return item ? { app, windowId, kind: 'explain', path: item } : null
  }
  if (app === 'event-viewer') {
    const row = c['selectedRow'] as { id?: number; source?: string; name?: string; payload?: string } | null | undefined
    return row ? { app, windowId, kind: 'explain', text: `Event ${row.id ?? ''}, ${row.source ?? ''} ${row.name ?? ''}\n${row.payload ?? ''}`.trim() } : null
  }
  if (app === 'terminal') {
    const lines = Array.isArray(c['lastOutput']) ? (c['lastOutput'] as unknown[]).map(textOf).join('\n') : ''
    const text = selection || lines
    return text.trim() ? { app, windowId, kind: 'explain', text } : null
  }
  if (!selection.trim()) return null
  return { app, windowId, kind: 'explain', text: selection, ...(path ? { path } : {}), ...(range ? { range } : {}), ...(textOf(c['url']) ? { url: textOf(c['url']), title: textOf(c['title']) } : {}) }
}

/**
 * The chip "Explain this": it sends the message of `askChatPrompt` (the selection travels, like the right-click route);
 * with nothing selected it is disabled and the tooltip says "Select some text first."
 */
export function explainChip(app: AppKind, windowId: number, context: Record<string, unknown> | null | undefined, label = 'Explain this'): Suggestion {
  const request = explainRequest(app, windowId, context)
  return request ? chip('explain', label, askChatPrompt(request)) : { ...chip('explain', label), disabled: true, tip: SELECT_FIRST_TIP }
}

/** Two or three chips for the short exchanges of the compact pane, picked from what the app's context holds. */
export function suggestionsFor(app: AppKind, context: Record<string, unknown> | null | undefined, windowId = 0): Suggestion[] {
  const c = context ?? {}
  const selection = has(c['selection'])
  switch (app) {
    case 'code': {
      return [
        has(c['openFile']) || selection ? explainChip(app, windowId, c) : chip('explain', 'What can I do here?'),
        ...(has(c['openFile']) ? [chip('changed', 'What changed in this file?')] : []),
        ...(has(c['openFile']) ? [chip('bugs', 'Any bugs here?')] : [])
      ]
    }
    case 'notepad':
    case 'wordpad':
      return [explainChip(app, windowId, c), chip('summarise', selection ? 'Summarise the selection' : 'Summarise this'), chip('proofread', 'Fix typos')]
    case 'explorer':
      return has(c['selectedItems']) ? [explainChip(app, windowId, c), chip('find', 'Which of these changed?')] : [chip('folder', 'What is in this folder?'), chip('find', 'Where is the main code?')]
    case 'terminal':
      return [explainChip(app, windowId, c, 'Explain this output'), chip('failed', 'Why did it fail?')]
    case 'browser':
      return [chip('summarise', 'Summarise this page'), ...(selection ? [explainChip(app, windowId, c)] : [chip('links', 'What are the main links?')])]
    case 'event-viewer':
      return has(c['selectedRow']) ? [explainChip(app, windowId, c, 'Explain this event')] : [chip('errors', 'Any errors in these events?')]
    case 'agent-manager':
      return [chip('context', 'Which chat uses the most context?')]
    case 'recycle-bin':
      return [chip('reverted', 'What did I revert?')]
    case 'paint':
      return [chip('describe', 'Describe the canvas'), chip('draw', 'Draw something simple')]
    case 'sticky-notes':
      return [chip('summarise', 'Summarise my notes')]
    case 'kanban':
      return [chip('summarise', 'Summarise this board'), chip('next', 'What should be done next?')]
    case 'help':
      return [chip('explain', 'Explain this topic')]
    default:
      return [chip('explain', 'What can I do here?')]
  }
}
