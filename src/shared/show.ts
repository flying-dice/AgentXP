/**
 * Show (`docs/AGENT_PRESENCE.md`, section 5): an agent deliberately points the operator at one thing, with a reason.
 * The target opens at the exact spot, the agent cursor glides there and a note callout says why. Only the foreground
 * chat may move the operator's view; any other chat asks with a request balloon.
 *
 * Pure types and functions only.
 */
import type { AppKind } from './desktop'
import type { AgentIdentity } from './identity'
import type { Id } from './models'
import { baseName } from './notices'

/** What the agent wants the operator to look at (the `target` of the `show` tool). */
export type ShowTarget =
  /** A file in Code, at a line range when given (1-based, inclusive). */
  | { kind: 'file'; path: string; lines?: [number, number] }
  /** A recorded change of this chat in Code's Changes pane: by id, by file, or the latest one. */
  | { kind: 'change'; path?: string; changeId?: Id }
  /** A comment of a Code Review window. */
  | { kind: 'review-comment'; id: Id }
  /** A card of a Kanban board (`boardId` an id or the board's name). */
  | { kind: 'card'; boardId: Id | string; cardId: Id }
  /** A shape or connector of the Agent Diagrams window. */
  | { kind: 'diagram-shape'; id: string }
  /** An element of the Browser page: a ref from browser_read or browser_find. */
  | { kind: 'page-element'; ref: number }
  /** An app window, brought forward. */
  | { kind: 'window'; app: AppKind }

/** A box in CSS pixels relative to the page area of a Browser window. */
export interface PageBoxDto {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Where a show landed, in the terms the renderer resolves to a rectangle on screen (`lib/desktop/showResolvers.ts`):
 * the window, plus the line range, change, comment, card, shape or page box inside it.
 */
export type ShowSpot =
  | { kind: 'lines'; windowId: Id; path: string; lines: [number, number] | null }
  | { kind: 'change'; windowId: Id; changeId: Id }
  | { kind: 'comment'; windowId: Id; commentId: Id }
  | { kind: 'card'; windowId: Id; cardId: Id }
  | { kind: 'shape'; windowId: Id; shapeId: string }
  | { kind: 'page-box'; windowId: Id; box: PageBoxDto }
  | { kind: 'window'; windowId: Id }

/** A show on screen now (`desktop.show`). One at a time per desktop. */
export interface ShowDto {
  desktopId: Id
  showId: string
  sessionId: Id
  identity: AgentIdentity
  target: ShowTarget
  /** The target in words: "auth.ts:40-62", "the comment on auth.ts:12", "card 'Login bug'". */
  label: string
  /** Why the operator should look (required, short). */
  note: string
  spot: ShowSpot
  /** False for **Show again** (the operator asked): the view lands, no cursor glides. */
  cursor: boolean
  at: string
}

export type ShowEndReason = 'dismissed' | 'paused' | 'replaced'

/** The agent cursor points at a spot without a note: a Browser action about to happen (`desktop.agentCursor`). */
export interface AgentCursorDto {
  desktopId: Id
  sessionId: Id
  identity: AgentIdentity
  spot: ShowSpot
}

export interface ShowEvents {
  'desktop.show': ShowDto
  'desktop.showEnded': { desktopId: Id; showId: string; reason: ShowEndReason }
  /** Shows that wait their turn plus requests nobody answered yet ("2 things to look at" in the Action Center). */
  'desktop.showQueue': { desktopId: Id; waiting: number }
  'desktop.agentCursor': AgentCursorDto
}

/** The longest note the `show` tool takes: a sentence or two. */
export const SHOW_NOTE_MAX = 280

/** How long the agent cursor glides to its target (the one motion exception, `XP_DESIGN_LANGUAGE.md` "Motion"). */
export const GLIDE_MS = 300

/** How long the agent cursor stays after it arrived and nothing more happens; then it fades. */
export const CURSOR_IDLE_MS = 1500

/** "auth.ts:40-62", "auth.ts:12", "auth.ts". */
export function showFileLabel(path: string, lines?: readonly [number, number] | null): string {
  const name = baseName(path)
  if (!lines) return name
  return lines[0] === lines[1] ? `${name}:${lines[0]}` : `${name}:${lines[0]}-${lines[1]}`
}

/** The target in words, before it is resolved (the request balloon and the transcript row use the resolved label). */
export function showTargetLabel(target: ShowTarget): string {
  switch (target.kind) {
    case 'file':
      return showFileLabel(target.path, target.lines)
    case 'change':
      return target.path ? `the change of ${baseName(target.path)}` : 'your latest change'
    case 'review-comment':
      return 'a review comment'
    case 'card':
      return 'a card'
    case 'diagram-shape':
      return `the shape ${target.id}`
    case 'page-element':
      return `an element of the page [${target.ref}]`
    case 'window':
      return `the ${target.app} window`
  }
}

/** The words of a request balloon: "Builder wants to show you auth.ts:40-62". */
export const showRequestText = (name: string, label: string): string => `${name} wants to show you ${label}`

/**
 * What the `show` tool did, as the first words of its result. The transcript row reads them back
 * (`showOutcomeOf`), so they are part of the contract between main and the chat.
 */
export const SHOW_RESULT = {
  shown: 'Shown now:',
  queued: 'Queued:',
  request: 'Sent as a request:',
  never: 'Not shown (Never):',
  declined: 'Not shown (declined):'
} as const

export type ShowOutcome = keyof typeof SHOW_RESULT

/** The outcome a `show` result names (null for an error or another text). */
export function showOutcomeOf(result: string | null | undefined): ShowOutcome | null {
  const text = (result ?? '').trim()
  for (const [outcome, prefix] of Object.entries(SHOW_RESULT) as [ShowOutcome, string][]) if (text.startsWith(prefix)) return outcome
  return null
}

/**
 * A `show` result: the outcome and the target on the first line, what happens next on the second
 * (`Shown now: auth.ts:40-62\nThe user sees ...`).
 */
export const showResultText = (outcome: ShowOutcome, label: string, explanation: string): string => `${SHOW_RESULT[outcome]} ${label}\n${explanation}`

/** The label of a `show` result: `Shown now: auth.ts:40-62\n...` -> `auth.ts:40-62`. */
export function showLabelOf(result: string | null | undefined): string | null {
  const first = (result ?? '').trim().split('\n')[0] ?? ''
  const outcome = showOutcomeOf(first)
  if (!outcome) return null
  const label = first.slice(SHOW_RESULT[outcome].length).trim()
  return label || null
}

/** The transcript row of a `show` call: "Showed you auth.ts:40-62: <note>", "Asked to show you ...", "Not shown (Never)". */
export function showRowTitle(outcome: ShowOutcome | null, label: string, note: string): string {
  const why = note.trim() ? `: ${note.trim()}` : ''
  switch (outcome) {
    case 'shown':
      return `Showed you ${label}${why}`
    case 'queued':
      return `Will show you ${label}${why}`
    case 'request':
      return `Asked to show you ${label}${why}`
    case 'never':
      return `Not shown (Never): ${label}`
    case 'declined':
      return `Not shown (you declined): ${label}`
    default:
      return `Show you ${label}${why}`
  }
}

/** Parses the `target` of a show tool call's input (the transcript row), or null when it is not a known target. */
export function parseShowTarget(value: unknown): ShowTarget | null {
  if (typeof value !== 'object' || value === null) return null
  const t = value as Record<string, unknown>
  const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null)
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
  switch (t['kind']) {
    case 'file': {
      const path = str(t['path'])
      if (!path) return null
      const lines = Array.isArray(t['lines']) && t['lines'].length === 2 && t['lines'].every((n) => int(n) !== null) ? ([t['lines'][0], t['lines'][1]] as [number, number]) : undefined
      return { kind: 'file', path, ...(lines ? { lines } : {}) }
    }
    case 'change': {
      const path = str(t['path'])
      const changeId = int(t['changeId'])
      return { kind: 'change', ...(path ? { path } : {}), ...(changeId !== null ? { changeId } : {}) }
    }
    case 'review-comment':
      return int(t['id']) === null ? null : { kind: 'review-comment', id: int(t['id'])! }
    case 'card': {
      const cardId = int(t['cardId'])
      const boardId = int(t['boardId']) ?? str(t['boardId'])
      return cardId === null || boardId === null ? null : { kind: 'card', boardId, cardId }
    }
    case 'diagram-shape':
      return str(t['id']) ? { kind: 'diagram-shape', id: str(t['id'])! } : null
    case 'page-element':
      return int(t['ref']) === null ? null : { kind: 'page-element', ref: int(t['ref'])! }
    case 'window':
      return str(t['app']) ? { kind: 'window', app: str(t['app']) as AppKind } : null
    default:
      return null
  }
}
