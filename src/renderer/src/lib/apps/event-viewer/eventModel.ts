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
}

export const noFilter = (): EventFilter => ({ source: null, sessionId: null, level: 'all', text: '' })

export function matchesFilter(e: ProtocolEventDto, f: EventFilter): boolean {
  if (f.source && e.source !== f.source) return false
  if (f.sessionId !== null && e.sessionId !== f.sessionId) return false
  if (f.level !== 'all' && e.level !== f.level) return false
  const text = f.text.trim().toLowerCase()
  return !text || `${e.name} ${e.source} ${e.payload}`.toLowerCase().includes(text)
}

export const filterEvents = (events: readonly ProtocolEventDto[], f: EventFilter): ProtocolEventDto[] => events.filter((e) => matchesFilter(e, f))

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
  for (const v of Object.values(value)) {
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
