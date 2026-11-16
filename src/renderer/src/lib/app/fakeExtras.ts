/**
 * In-memory sticky notes, protocol events, recycle bin and snip for Storybook and tests
 * (the DesktopExtrasApi groups of the fake backend).
 */
import type { Id } from '@shared/models'
import type { VPath } from '@shared/vfs'
import type { DesktopExtrasApi, DesktopExtrasEvents, ProtocolEventDto, ProtocolEventQuery, RecycledChangeDto, StickyNoteDto } from '@shared/desktop'

type Emit = <K extends keyof DesktopExtrasEvents>(event: K, payload: DesktopExtrasEvents[K]) => void

const at = (minutes: number): string => new Date(Date.UTC(2026, 10, 16, 9, 30 - minutes, 12)).toISOString()

export const sampleNotes: StickyNoteDto[] = [
  { id: 1, desktopId: 1, text: 'Remember: login redirect must keep the ?next= parameter', color: 'yellow', bounds: { x: 640, y: 90, width: 200, height: 170 }, planSessionId: null, author: 'user' },
  { id: 2, desktopId: 1, text: '', color: 'blue', bounds: { x: 860, y: 90, width: 220, height: 190 }, planSessionId: 1, author: 'agent' },
  { id: 3, desktopId: 1, text: 'Ask the agent to add tests for parseRedirect', color: 'green', bounds: { x: 640, y: 290, width: 190, height: 130 }, planSessionId: null, author: 'agent' }
]

const payload = (value: unknown): string => JSON.stringify(value, null, 2)

export const sampleEvents: ProtocolEventDto[] = [
  { id: 1, at: at(9), desktopId: 1, sessionId: 1, source: 'acp', direction: 'out', level: 'info', name: 'initialize', payload: payload({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true } } }) },
  { id: 2, at: at(9), desktopId: 1, sessionId: 1, source: 'acp', direction: 'in', level: 'info', name: 'initialize', payload: payload({ jsonrpc: '2.0', id: 0, result: { protocolVersion: 1, agentInfo: { name: 'claude-code', version: '1.4.2' } } }) },
  { id: 3, at: at(8), desktopId: 1, sessionId: 1, source: 'ag-ui', direction: 'out', level: 'info', name: 'RUN_STARTED', payload: payload({ type: 'RUN_STARTED', threadId: '1', runId: 'run-7' }) },
  { id: 4, at: at(8), desktopId: 1, sessionId: 1, source: 'acp', direction: 'out', level: 'info', name: 'session/prompt', payload: payload({ jsonrpc: '2.0', id: 3, method: 'session/prompt', params: { sessionId: 'sess-1', prompt: [{ type: 'text', text: 'Fix the login redirect bug' }] } }) },
  { id: 5, at: at(7), desktopId: 1, sessionId: 1, source: 'acp', direction: 'in', level: 'info', name: 'session/update', payload: payload({ jsonrpc: '2.0', method: 'session/update', params: { update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Looking at src/auth/redirect.ts' } } } }) },
  { id: 6, at: at(6), desktopId: 1, sessionId: 1, source: 'mcp', direction: 'in', level: 'info', name: 'tools/call desktop_open_app', payload: payload({ name: 'desktop_open_app', arguments: { app: 'paint' } }) },
  { id: 7, at: at(5), desktopId: 1, sessionId: 1, source: 'acp', direction: 'in', level: 'warning', name: 'session/request_permission', payload: payload({ jsonrpc: '2.0', id: 11, method: 'session/request_permission', params: { toolCall: { title: 'Write src/auth/redirect.ts' } } }) },
  { id: 8, at: at(4), desktopId: 1, sessionId: 1, source: 'ag-ui', direction: 'out', level: 'info', name: 'TOOL_CALL_START', payload: payload({ type: 'TOOL_CALL_START', toolCallId: 't-1', toolCallName: 'edit' }) },
  { id: 9, at: at(3), desktopId: 1, sessionId: 2, source: 'acp', direction: 'in', level: 'error', name: 'fs/write_text_file', payload: payload({ jsonrpc: '2.0', id: 4, error: { code: -32000, message: 'The Code app is closed on this desktop. Call desktop_open_app with app "code" to open it.' } }) },
  { id: 10, at: at(2), desktopId: 1, sessionId: 1, source: 'ag-ui', direction: 'out', level: 'info', name: 'RUN_FINISHED', payload: payload({ type: 'RUN_FINISHED', threadId: '1', runId: 'run-7' }) }
]

export const sampleRecycled: RecycledChangeDto[] = [
  { id: 1, desktopId: 1, sessionId: 1, path: 'E:\\src\\auth\\redirect.ts', revertedText: "export function parseRedirect(url: string): string {\n  const next = new URL(url).searchParams.get('next')\n  return next && next.startsWith('/') ? next : '/'\n}\n", restoredText: "export function parseRedirect(url: string): string {\n  return new URL(url).searchParams.get('next') ?? '/'\n}\n", revertedAt: at(20) },
  { id: 2, desktopId: 1, sessionId: 1, path: 'E:\\tests\\session.test.ts', revertedText: "import { describe, it, expect } from 'vitest'\n\ndescribe('session', () => {\n  it('expires', () => expect(true).toBe(true))\n})\n", restoredText: null, revertedAt: at(55) }
]

/** A little picture of a desktop, standing in for a captured PNG. */
export const sampleSnip = (w = 240, h = 140): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 240 140"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f6fb8"/><stop offset="1" stop-color="#6fc3e8"/></linearGradient></defs><rect width="240" height="140" fill="url(#g)"/><rect x="24" y="18" width="140" height="82" rx="3" fill="#dce6f4" stroke="#27456b"/><rect x="24" y="18" width="140" height="14" rx="3" fill="#6fa3d8"/><rect x="32" y="40" width="90" height="5" fill="#8da2bc"/><rect x="32" y="52" width="110" height="5" fill="#8da2bc"/><rect x="32" y="64" width="70" height="5" fill="#8da2bc"/><rect y="124" width="240" height="16" fill="#26466e"/></svg>`
  )}`

export function createFakeExtras(emit: Emit): DesktopExtrasApi & { pushEvent(event: Omit<ProtocolEventDto, 'id' | 'at'>): void } {
  let notes = sampleNotes.map((n) => ({ ...n }))
  let events = [...sampleEvents]
  let recycled = [...sampleRecycled]
  let nextId = 100
  const changedNotes = (): void => emit('notes.changed', { desktopId: 1, notes })

  const matches = (e: ProtocolEventDto, q: ProtocolEventQuery): boolean =>
    e.desktopId === q.desktopId &&
    (q.sessionId == null || e.sessionId === q.sessionId) &&
    (!q.source || e.source === q.source) &&
    (!q.level || e.level === q.level) &&
    (!q.text || `${e.name} ${e.payload}`.toLowerCase().includes(q.text.toLowerCase())) &&
    (q.afterId === undefined || e.id > q.afterId)

  return {
    notes: {
      list: async (desktopId: Id) => notes.filter((n) => n.desktopId === desktopId),
      add: async (desktopId, text, color = 'yellow') => {
        const note: StickyNoteDto = { id: nextId++, desktopId, text, color, bounds: { x: 120 + (notes.length % 5) * 28, y: 90 + (notes.length % 5) * 28, width: 200, height: 170 }, planSessionId: null, author: 'user' }
        notes = [...notes, note]
        changedNotes()
        return note
      },
      update: async (id, patch) => {
        notes = notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
        changedNotes()
        return notes.find((n) => n.id === id)!
      },
      remove: async (id) => {
        notes = notes.filter((n) => n.id !== id)
        changedNotes()
      }
    },
    events: {
      query: async (q) => events.filter((e) => matches(e, q)).slice(-(q.limit ?? 500)),
      clear: async () => void (events = [])
    },
    recycle: {
      list: async (desktopId) => recycled.filter((r) => r.desktopId === desktopId),
      restore: async (id) => {
        recycled = recycled.filter((r) => r.id !== id)
        emit('recycle.changed', { desktopId: 1 })
      },
      remove: async (id) => {
        recycled = recycled.filter((r) => r.id !== id)
        emit('recycle.changed', { desktopId: 1 })
      },
      empty: async () => {
        recycled = []
        emit('recycle.changed', { desktopId: 1 })
      }
    },
    snip: {
      capture: async (_id, region) => sampleSnip(region?.width ?? 240, region?.height ?? 140),
      save: async (_id, _dataUrl) => ({ path: 'C:\\Pictures\\Snips\\Snip-1.png' as VPath, filePath: '/fake/C/Pictures/Snips/Snip-1.png' })
    },
    pushEvent: (event) => {
      const full: ProtocolEventDto = { ...event, id: Math.max(0, ...events.map((e) => e.id)) + 1, at: new Date().toISOString() }
      events = [...events, full]
      emit('events.appended', [full])
    }
  }
}
