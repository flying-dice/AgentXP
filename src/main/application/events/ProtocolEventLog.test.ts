import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProtocolEventDto } from '@shared/desktop'
import { TOOL_REFUSED_CODE } from '../../domain/agent/ToolGate'
import { RecordingPublisher } from '../test-helpers'
import { PAYLOAD_LIMIT, ProtocolEventLog, prettyPayload } from './ProtocolEventLog'

let publisher: RecordingPublisher
let log: ProtocolEventLog

const make = (capacity?: number): ProtocolEventLog =>
  new ProtocolEventLog({ desktopOfSession: (id) => (id === 1 || id === 2 ? 10 : id === 3 ? 20 : null), events: publisher, capacity })

beforeEach(() => {
  vi.useFakeTimers()
  publisher = new RecordingPublisher()
  log = make()
})
afterEach(() => {
  log.dispose()
  vi.useRealTimers()
})

const add = (sessionId: number | null, name: string, extra: Partial<Parameters<ProtocolEventLog['record']>[0]> = {}) =>
  log.record({ sessionId, source: 'acp', direction: 'out', name, payload: { name }, ...extra })

describe('ProtocolEventLog buffer', () => {
  it('keeps the newest 5000 events per desktop', () => {
    log.dispose()
    log = make(5000)
    for (let i = 0; i < 5003; i++) add(1, `m${i}`)
    add(3, 'other desktop')
    const kept = log.query({ desktopId: 10, limit: 10_000 })
    expect(kept).toHaveLength(5000)
    expect(kept[0]?.name).toBe('m3')
    expect(kept.at(-1)?.name).toBe('m5002')
    expect(log.query({ desktopId: 20 })).toHaveLength(1)
  })

  it('numbers events, derives the desktop from the chat and ignores chats without a desktop', () => {
    const a = add(1, 'a')
    expect(a).toMatchObject({ id: 1, desktopId: 10, sessionId: 1, level: 'info', source: 'acp' })
    expect(add(99, 'nobody')).toBeNull()
    expect(add(null, 'no chat')).toBeNull()
    expect(add(null, 'explicit desktop', { desktopId: 10 })).toMatchObject({ id: 2, sessionId: null })
  })

  it('pretty-prints payloads and truncates them at 64 KB', () => {
    expect(prettyPayload({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}')
    const big = prettyPayload({ text: 'x'.repeat(PAYLOAD_LIMIT * 2) })
    expect(big.length).toBeLessThan(PAYLOAD_LIMIT + 50)
    expect(big.endsWith('(truncated)')).toBe(true)
    const circular: Record<string, unknown> = {}
    circular['self'] = circular
    expect(typeof prettyPayload(circular)).toBe('string')
  })
})

describe('ProtocolEventLog.query', () => {
  beforeEach(() => {
    add(1, 'session/prompt', { payload: { text: 'Hello World' } })
    add(2, 'session/update', { direction: 'in' })
    add(1, 'RUN_ERROR', { source: 'ag-ui', level: 'error' })
    add(1, 'tool', { source: 'mcp', level: 'warning', direction: 'in' })
    add(null, 'system', { desktopId: 10 })
  })
  const names = (q: Partial<Parameters<ProtocolEventLog['query']>[0]>): string[] => log.query({ desktopId: 10, ...q }).map((e) => e.name)

  it('filters by chat, source, level and text (name or payload, case-insensitive)', () => {
    expect(names({ sessionId: 2 })).toEqual(['session/update'])
    expect(names({ sessionId: null })).toEqual(['system'])
    expect(names({ source: 'ag-ui' })).toEqual(['RUN_ERROR'])
    expect(names({ level: 'warning' })).toEqual(['tool'])
    expect(names({ text: 'hello world' })).toEqual(['session/prompt'])
    expect(names({ text: 'SESSION/' })).toEqual(['session/prompt', 'session/update'])
    expect(names({ sessionId: 1, source: 'acp', text: 'prompt' })).toEqual(['session/prompt'])
    expect(log.query({ desktopId: 77 })).toEqual([])
  })

  it('returns the newest `limit` events, or the next ones after `afterId`', () => {
    expect(names({ limit: 2 })).toEqual(['tool', 'system'])
    expect(names({ afterId: 2, limit: 2 })).toEqual(['RUN_ERROR', 'tool'])
    expect(names({ afterId: 5 })).toEqual([])
  })

  it('clears one desktop', () => {
    add(3, 'keep')
    log.clear(10)
    expect(names({})).toEqual([])
    expect(log.query({ desktopId: 20 })).toHaveLength(1)
  })
})

describe('ProtocolEventLog push', () => {
  it('batches appends per desktop every 250 ms', () => {
    add(1, 'a')
    add(2, 'b')
    add(3, 'c')
    vi.advanceTimersByTime(249)
    expect(publisher.payloads('events.appended')).toEqual([])
    vi.advanceTimersByTime(1)
    const batches = publisher.payloads('events.appended')
    expect(batches.map((b) => b.map((e: ProtocolEventDto) => e.name))).toEqual([['a', 'b'], ['c']])
    expect(batches.map((b) => b[0]?.desktopId)).toEqual([10, 20])
    vi.advanceTimersByTime(1000)
    expect(publisher.payloads('events.appended')).toHaveLength(2) // nothing new, nothing sent
    add(1, 'd')
    vi.advanceTimersByTime(250)
    expect(publisher.payloads('events.appended')).toHaveLength(3)
  })

  it('does not push events that were cleared before the flush', () => {
    add(1, 'a')
    log.clear(10)
    vi.advanceTimersByTime(250)
    expect(publisher.payloads('events.appended')).toEqual([])
  })
})

describe('ProtocolEventLog.acpTap', () => {
  const one = (): ProtocolEventDto[] => log.query({ desktopId: 10 })

  it('names responses after their request and grades errors, refusals and cancellations', () => {
    const tap = log.acpTap(1)
    tap('out', { jsonrpc: '2.0', id: 1, method: 'session/prompt', params: {} })
    tap('in', { jsonrpc: '2.0', method: 'session/update', params: {} })
    tap('in', { jsonrpc: '2.0', id: 1, result: { stopReason: 'end_turn' } })
    tap('in', { jsonrpc: '2.0', id: 7, method: 'fs/write_text_file', params: {} })
    tap('out', { jsonrpc: '2.0', id: 7, error: { code: TOOL_REFUSED_CODE, message: 'closed' } })
    tap('out', { jsonrpc: '2.0', id: 2, method: 'session/prompt', params: {} })
    tap('in', { jsonrpc: '2.0', id: 2, result: { stopReason: 'cancelled' } })
    tap('out', { jsonrpc: '2.0', id: 3, method: 'session/new', params: {} })
    tap('in', { jsonrpc: '2.0', id: 3, error: { code: -32603, message: 'boom' } })
    tap('out', { jsonrpc: '2.0', method: 'session/cancel', params: {} })
    expect(one().map((e) => `${e.direction} ${e.name} ${e.level}`)).toEqual([
      'out session/prompt info',
      'in session/update info',
      'in session/prompt (response) info',
      'in fs/write_text_file info',
      'out fs/write_text_file (response) warning',
      'out session/prompt info',
      'in session/prompt (response) warning',
      'out session/new info',
      'in session/new (response) error',
      'out session/cancel warning'
    ])
    expect(one()[0]?.source).toBe('acp')
    expect(JSON.parse(one()[0]!.payload)).toMatchObject({ method: 'session/prompt' })
  })

  it('keeps ids of the two directions apart and survives odd messages', () => {
    const tap = log.acpTap(1)
    tap('out', { id: 1, method: 'a' })
    tap('in', { id: 1, method: 'b' })
    tap('in', { id: 1, result: {} })
    tap('out', { id: 1, result: {} })
    tap('in', 'garbage')
    tap('in', null)
    expect(one().map((e) => e.name)).toEqual(['a', 'b', 'a (response)', 'b (response)', 'response', 'response'])
  })
})

describe('ProtocolEventLog AG-UI and MCP records', () => {
  it('records AG-UI events (RUN_ERROR is an error) and MCP calls without image bytes', () => {
    log.recordAgui(1, { type: 'RUN_STARTED' })
    log.recordAgui(1, { type: 'RUN_ERROR', message: 'x' } as never)
    const context = { sessionId: 1, desktopId: 10 }
    log.recordToolCall(context, 'paint_read', undefined)
    log.recordToolResult(context, 'paint_read', { content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] }, false)
    log.recordToolResult(context, 'terminal_run', { content: [{ type: 'text', text: 'closed' }], isError: true }, true)
    const events = log.query({ desktopId: 10 })
    expect(events.map((e) => `${e.source} ${e.direction} ${e.name} ${e.level}`)).toEqual([
      'ag-ui out RUN_STARTED info',
      'ag-ui out RUN_ERROR error',
      'mcp in paint_read info',
      'mcp out paint_read info',
      'mcp out terminal_run warning'
    ])
    expect(events[3]?.payload).toContain('"bytes": 4')
    expect(events[3]?.payload).not.toContain('AAAA')
  })
})
