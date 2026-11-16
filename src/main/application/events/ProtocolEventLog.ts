import type { EventLevel, ProtocolEventDto, ProtocolEventQuery } from '@shared/desktop'
import type { Id } from '@shared/models'
import { TOOL_REFUSED_CODE } from '../../domain/agent/ToolGate'
import type { EventPublisher, ProtocolTap } from '../ports'

export const EVENT_CAPACITY = 5000
export const EVENT_FLUSH_MS = 250
export const PAYLOAD_LIMIT = 64 * 1024
const DEFAULT_QUERY_LIMIT = 1000
const MAX_PENDING_REQUESTS = 500

export interface ProtocolRecord {
  /** The chat the event belongs to; the desktop is derived from it unless `desktopId` is given. */
  sessionId: Id | null
  desktopId?: Id | null
  source: ProtocolEventDto['source']
  direction: ProtocolEventDto['direction']
  name: string
  payload: unknown
  level?: EventLevel
}

export interface ProtocolEventLogDeps {
  desktopOfSession(sessionId: Id): Id | null
  events: EventPublisher
  now?: () => Date
  capacity?: number
  flushMs?: number
}

/** Pretty JSON of `value`, cut at 64 KB. */
export function prettyPayload(value: unknown): string {
  let text: string
  try {
    text = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value))
  } catch {
    text = String(value)
  }
  return text.length > PAYLOAD_LIMIT ? `${text.slice(0, PAYLOAD_LIMIT)}\n... (truncated)` : text
}

interface JsonRpc {
  id?: string | number | null
  method?: string
  error?: { code?: number; message?: string }
  result?: { stopReason?: string } | null
}

/** Name and level of one JSON-RPC message: error for errors, warning for refusals and cancellations. */
export function classifyJsonRpc(message: JsonRpc, method: string | undefined): { name: string; level: EventLevel } {
  const name = message.method ?? (method ? `${method} (response)` : 'response')
  if (message.error) return { name, level: message.error.code === TOOL_REFUSED_CODE ? 'warning' : 'error' }
  const stop = message.result?.stopReason
  if (stop === 'refusal' || stop === 'cancelled') return { name, level: 'warning' }
  if (message.method === 'session/cancel') return { name, level: 'warning' }
  return { name, level: 'info' }
}

/**
 * The Event Viewer's data: an in-memory ring buffer of protocol events per desktop (ACP JSON-RPC,
 * AG-UI events, MCP tool calls). Appends are pushed to the owning window in batches.
 */
export class ProtocolEventLog {
  private readonly buffers = new Map<Id, ProtocolEventDto[]>()
  private pending: ProtocolEventDto[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private nextId = 1
  private readonly capacity: number
  private readonly flushMs: number
  private readonly now: () => Date

  constructor(private readonly deps: ProtocolEventLogDeps) {
    this.capacity = deps.capacity ?? EVENT_CAPACITY
    this.flushMs = deps.flushMs ?? EVENT_FLUSH_MS
    this.now = deps.now ?? (() => new Date())
  }

  /** Records one event; ignored when it belongs to no desktop. */
  record(record: ProtocolRecord): ProtocolEventDto | null {
    const desktopId = record.desktopId ?? (record.sessionId === null ? null : this.deps.desktopOfSession(record.sessionId))
    if (desktopId === null || desktopId === undefined) return null
    const event: ProtocolEventDto = {
      id: this.nextId++,
      at: this.now().toISOString(),
      desktopId,
      sessionId: record.sessionId,
      source: record.source,
      direction: record.direction,
      level: record.level ?? 'info',
      name: record.name,
      payload: prettyPayload(record.payload)
    }
    const buffer = this.buffers.get(desktopId) ?? []
    buffer.push(event)
    if (buffer.length > this.capacity) buffer.splice(0, buffer.length - this.capacity)
    this.buffers.set(desktopId, buffer)
    this.pending.push(event)
    this.timer ??= setTimeout(() => this.flush(), this.flushMs)
    this.timer.unref?.()
    return event
  }

  /** The ACP tap of one chat: classifies JSON-RPC messages and correlates responses with their request. */
  acpTap(sessionId: Id): ProtocolTap {
    const methods = new Map<string, string>()
    return (direction, raw) => {
      const message = (typeof raw === 'object' && raw !== null ? raw : {}) as JsonRpc
      const hasId = message.id !== undefined && message.id !== null
      let method: string | undefined
      if (message.method !== undefined) {
        if (hasId) {
          if (methods.size >= MAX_PENDING_REQUESTS) methods.delete(methods.keys().next().value as string)
          methods.set(`${direction}:${String(message.id)}`, message.method)
        }
      } else if (hasId) {
        const key = `${direction === 'in' ? 'out' : 'in'}:${String(message.id)}`
        method = methods.get(key)
        methods.delete(key)
      }
      const { name, level } = classifyJsonRpc(message, method)
      this.record({ sessionId, source: 'acp', direction, name, level, payload: raw })
    }
  }

  /** An MCP tool call of the agent (`in`) and its result (`out`); images are summarised, not stored. */
  recordToolCall(context: { sessionId: Id; desktopId?: Id }, tool: string, args: unknown): void {
    this.record({ sessionId: context.sessionId, desktopId: context.desktopId, source: 'mcp', direction: 'in', name: tool, payload: args ?? {} })
  }

  recordToolResult(context: { sessionId: Id; desktopId?: Id }, tool: string, result: { content: { type: string; text?: string; mimeType?: string; data?: string }[]; isError?: boolean }, refused: boolean): void {
    const content = result.content.map((c) => (c.type === 'image' ? { type: 'image', mimeType: c.mimeType, bytes: c.data?.length ?? 0 } : c))
    const level: EventLevel = refused ? 'warning' : result.isError ? 'error' : 'info'
    this.record({ sessionId: context.sessionId, desktopId: context.desktopId, source: 'mcp', direction: 'out', name: tool, level, payload: { isError: result.isError ?? false, content } })
  }

  /** An AG-UI event sent to the renderer for a run of `sessionId`. */
  recordAgui(sessionId: Id, event: { type?: unknown }): void {
    const name = String(event.type ?? 'unknown')
    this.record({ sessionId, source: 'ag-ui', direction: 'out', name, level: name === 'RUN_ERROR' ? 'error' : 'info', payload: event })
  }

  query(query: ProtocolEventQuery): ProtocolEventDto[] {
    const needle = query.text?.trim().toLowerCase()
    const matches = (this.buffers.get(query.desktopId) ?? []).filter(
      (e) =>
        (query.afterId === undefined || e.id > query.afterId) &&
        (query.sessionId === undefined || e.sessionId === query.sessionId) &&
        (query.source === undefined || e.source === query.source) &&
        (query.level === undefined || e.level === query.level) &&
        (!needle || e.name.toLowerCase().includes(needle) || e.payload.toLowerCase().includes(needle))
    )
    const limit = Math.max(1, query.limit ?? DEFAULT_QUERY_LIMIT)
    // Following the log (`afterId`) wants the next events; otherwise the newest ones.
    return query.afterId === undefined ? matches.slice(-limit) : matches.slice(0, limit)
  }

  clear(desktopId: Id): void {
    this.buffers.delete(desktopId)
    this.pending = this.pending.filter((e) => e.desktopId !== desktopId)
  }

  /** Pushes what was recorded since the last flush, one message per desktop. */
  flush(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const batch = this.pending
    this.pending = []
    const byDesktop = new Map<Id, ProtocolEventDto[]>()
    for (const event of batch) byDesktop.set(event.desktopId, [...(byDesktop.get(event.desktopId) ?? []), event])
    for (const events of byDesktop.values()) this.deps.events.publish('events.appended', events)
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
