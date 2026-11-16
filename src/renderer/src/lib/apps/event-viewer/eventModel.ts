/** Pure logic of the Event Viewer: filtering, the log tree, row and detail text. */
import type { EventLevel, ProtocolEventDto } from '@shared/desktop'
import type { SessionDto } from '@shared/models'
import type { IconName } from '../../kit/atoms/icons'
import type { TreeNodeData } from '../../kit/organisms/TreeView'
import { formatDateTime } from '../shared/dates'

export { formatDateTime }

export const MAX_EVENTS = 2000

export type Source = ProtocolEventDto['source']
export const SOURCE_LABEL: Record<Source, string> = { acp: 'ACP', 'ag-ui': 'AG-UI', mcp: 'MCP' }
/** What each log is, for the tooltip of its name (the names ACP, AG-UI and MCP mean nothing to most people). */
export const SOURCE_HINT: Record<Source, string> = {
  acp: 'ACP: how Agent7 talks to the agent',
  'ag-ui': 'AG-UI: how the agent shows its answer in the chat',
  mcp: 'MCP: how the agent uses the tools of the desktop'
}
export const LEVEL_LABEL: Record<EventLevel, string> = { info: 'Information', warning: 'Warning', error: 'Error' }
export const LEVEL_ICON: Record<EventLevel, IconName> = { info: 'info', warning: 'warning', error: 'error' }

export interface EventFilter {
  /** Source log selected in the tree. */
  source: Source | null
  sessionId: number | null
  level: EventLevel | 'all'
  text: string
  /**
   * Hides the protocol traffic (level Information) while `level` is All levels, so the warning is not lost among 28 other events.
   * An explicit level always wins: asking for Information shows it. Default false (everything).
   */
  quiet?: boolean
}

export const noFilter = (): EventFilter => ({ source: null, sessionId: null, level: 'all', text: '' })

/** True for the events the viewer shows by default: warnings and errors. */
export const isNotable = (e: Pick<ProtocolEventDto, 'level'>): boolean => e.level !== 'info'

export function matchesFilter(e: ProtocolEventDto, f: EventFilter): boolean {
  if (f.source && e.source !== f.source) return false
  if (f.sessionId !== null && e.sessionId !== f.sessionId) return false
  if (f.level !== 'all' && e.level !== f.level) return false
  if (f.quiet && f.level === 'all' && !isNotable(e)) return false
  const text = f.text.trim().toLowerCase()
  return !text || `${e.name} ${e.source} ${e.payload}`.toLowerCase().includes(text)
}

export const filterEvents = (events: readonly ProtocolEventDto[], f: EventFilter): ProtocolEventDto[] => events.filter((e) => matchesFilter(e, f))

/** How many of the newest events the first view shows when it has no warning or error to show. */
export const FALLBACK_COUNT = 5

export interface EventView {
  /** The rows to show. */
  shown: ProtocolEventDto[]
  /** Events the view leaves out and Show all would add. */
  hidden: number
  /** The list has no warning or error, so it shows the newest events instead (the reason a chat stopped is among them). */
  latest: boolean
}

/**
 * What the list shows. With "Show all" off and no level chosen, warnings and errors only; when there are none, the newest
 * few events so the first view is never empty while the log is not (UX-171). `hidden` counts what Show all would add.
 */
export function eventView(events: readonly ProtocolEventDto[], f: EventFilter, showAll: boolean): EventView {
  const all = filterEvents(events, { ...f, quiet: false })
  if (showAll || f.level !== 'all') return { shown: all, hidden: 0, latest: false }
  const notable = all.filter(isNotable)
  if (notable.length > 0 || all.length === 0) return { shown: notable, hidden: all.length - notable.length, latest: false }
  const shown = all.slice(-FALLBACK_COUNT)
  return { shown, hidden: all.length - shown.length, latest: true }
}

/** The line of an empty list: what is true and the way out, "Nothing to show with this filter. Show all (27)" is the link part. */
export const EMPTY_TEXT = 'Nothing to show with this filter.'
export const showAllText = (total: number): string => `Show all (${total})`

/**
 * The event that belongs to a failed tool call: an error of that call first, else the newest event that names the call.
 * `events` is oldest first (the order of the log); null when no event names the call.
 */
export function eventForToolCall(events: readonly ProtocolEventDto[], toolCallId: string): ProtocolEventDto | null {
  const named = events.filter((e) => e.payload.includes(toolCallId))
  return [...named].reverse().find((e) => e.level === 'error') ?? named.at(-1) ?? null
}

/** Appends new events (ignoring ids already present), keeping the newest MAX_EVENTS. */
export function appendEvents(list: readonly ProtocolEventDto[], added: readonly ProtocolEventDto[], max = MAX_EVENTS): ProtocolEventDto[] {
  const seen = new Set(list.map((e) => e.id))
  const fresh = added.filter((e) => !seen.has(e.id))
  if (fresh.length === 0) return list as ProtocolEventDto[]
  const next = [...list, ...fresh]
  return next.length > max ? next.slice(next.length - max) : next
}

/** Tree node ids. */
export const ALL_NODE = 'all'
export const sourceNode = (s: Source): string => `source:${s}`
export const chatNode = (id: number): string => `chat:${id}`

export function logTree(sessions: readonly Pick<SessionDto, 'id' | 'title'>[]): TreeNodeData[] {
  return [
    {
      id: 'root',
      text: 'Event Viewer',
      icon: 'eventlog',
      expanded: true,
      children: [
        {
          id: ALL_NODE,
          text: 'Agent7 Logs',
          icon: 'folder',
          expanded: true,
          children: (Object.keys(SOURCE_LABEL) as Source[]).map((s) => ({ id: sourceNode(s), text: SOURCE_LABEL[s], title: SOURCE_HINT[s], icon: 'file-text' as const }))
        },
        {
          id: 'chats',
          text: 'Chats',
          icon: 'folder',
          expanded: true,
          children: sessions.map((s) => ({ id: chatNode(s.id), text: s.title || 'New chat', icon: 'session' as const }))
        }
      ]
    }
  ]
}

/** The tree selection as a filter part. */
export function nodeScope(id: string | null): { source: Source | null; sessionId: number | null; title: string } {
  if (id?.startsWith('source:')) {
    const source = id.slice(7) as Source
    return { source, sessionId: null, title: SOURCE_LABEL[source] ?? id }
  }
  if (id?.startsWith('chat:')) return { source: null, sessionId: Number(id.slice(5)), title: 'Chat' }
  return { source: null, sessionId: null, title: 'Agent7 Logs' }
}

/** The General tab: a few readable lines. */
export function generalLines(e: ProtocolEventDto, chat: string | undefined): [string, string][] {
  return [
    ['Log Name', SOURCE_LABEL[e.source]],
    ['Event', e.name],
    ['Direction', e.direction === 'in' ? 'From the agent' : 'To the agent'],
    ['Level', LEVEL_LABEL[e.level]],
    ['Logged', formatDateTime(e.at)],
    ['Chat', chat ?? (e.sessionId === null ? '(none)' : `Chat ${e.sessionId}`)],
    ['Event ID', String(e.id)]
  ]
}

/** Short summary of the payload for the General tab: the JSON-RPC error message, or the first string found. */
export function summaryOf(payload: string): string {
  try {
    const value = JSON.parse(payload) as Record<string, unknown>
    const error = value.error as { message?: unknown } | undefined
    if (typeof error?.message === 'string') return error.message
    const found = firstString(value, 0)
    return found ?? ''
  } catch {
    return payload.slice(0, 200)
  }
}

function firstString(value: unknown, depth: number): string | null {
  if (typeof value === 'string') return value.length > 3 ? value.slice(0, 200) : null
  if (depth > 5 || value === null || typeof value !== 'object') return null
  for (const [key, v] of Object.entries(value)) {
    if (key === 'type' || key === 'mimeType') continue
    const found = firstString(v, depth + 1)
    if (found) return found
  }
  return null
}

/** Index of the next row after `from` whose event contains `text` (wraps around), or -1. */
export function findNext(events: readonly ProtocolEventDto[], text: string, from: number): number {
  const needle = text.trim().toLowerCase()
  if (!needle || events.length === 0) return -1
  for (let k = 1; k <= events.length; k++) {
    const i = (from + k + events.length) % events.length
    const e = events[i]
    if (`${e.name} ${e.payload}`.toLowerCase().includes(needle)) return i
  }
  return -1
}

export interface ProblemLine {
  level: Exclude<EventLevel, 'info'>
  /** One plain sentence, never a protocol word. */
  text: string
}

const PROTOCOL_WORD = /RUN_ERROR|RUN_FINISHED|JSON-?RPC|\bACP\b|AG-UI|\bMCP\b|session\/|\(response\)|\bInternal error\b|\bnpx\b/i
const DRIVE_GONE = /Drive ([A-Z]):\s+(?:is not plugged in|was removed)/
const CONNECTION = /closed before|connection|disconnect|econnreset|epipe|socket/i

/** A plain sentence for one warning or error: what it says when that is readable, else one sentence per kind of event (UX-188). */
export function problemSentence(e: ProtocolEventDto): string {
  const message = summaryOf(e.payload).replace(/\s+/g, ' ').trim()
  const drive = DRIVE_GONE.exec(message) ?? DRIVE_GONE.exec(e.payload)
  if (drive) return `Drive ${drive[1]}: was removed`
  if (CONNECTION.test(message)) return 'The connection dropped'
  if (e.name === 'RUN_ERROR') return 'The agent stopped unexpectedly'
  if (message && !PROTOCOL_WORD.test(message) && message.length <= 160) return message
  if (e.level === 'warning') return e.name === 'session/cancel' || /cancel/i.test(e.payload) ? 'The agent was stopped' : 'The agent was not allowed to do that'
  if (e.source === 'mcp') return 'A tool of the desktop could not finish'
  return e.source === 'ag-ui' ? 'The agent stopped unexpectedly' : 'The agent reported a problem'
}

/** A chat that finished a turn after event `e` has recovered from it (a later RUN_FINISHED of the same chat). */
const recovered = (events: readonly ProtocolEventDto[], e: ProtocolEventDto): boolean =>
  e.sessionId !== null && events.some((o) => o.id > e.id && o.sessionId === e.sessionId && o.name === 'RUN_FINISHED' && o.level === 'info')

/**
 * The newest warning or error of the log that is still current, for the Activity gadget; null when there is none.
 * A problem of a chat is dropped once the same chat has a later successful turn. `events` is oldest first.
 */
export function lastProblem(events: readonly ProtocolEventDto[]): ProblemLine | null {
  const e = events.findLast((o) => isNotable(o) && !recovered(events, o))
  return e ? { level: e.level as ProblemLine['level'], text: problemSentence(e) } : null
}
