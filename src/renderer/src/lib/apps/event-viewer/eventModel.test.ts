import { describe, expect, it } from 'vitest'
import type { ProtocolEventDto } from '@shared/desktop'
import { SOURCE_HINT, ALL_NODE, appendEvents, chatNode, filterEvents, findNext, generalLines, logTree, noFilter, nodeScope, sourceNode, summaryOf } from './eventModel'

const ev = (id: number, over: Partial<ProtocolEventDto> = {}): ProtocolEventDto => ({ id, at: '2026-11-16T09:00:00Z', desktopId: 1, sessionId: 1, source: 'acp', direction: 'in', level: 'info', name: `m${id}`, payload: '{}', ...over })

describe('filterEvents', () => {
  const list = [ev(1), ev(2, { source: 'mcp', level: 'error', payload: '{"x":"Boom"}' }), ev(3, { sessionId: 2, source: 'ag-ui' })]
  it('filters by source, chat, level and text', () => {
    expect(filterEvents(list, noFilter())).toHaveLength(3)
    expect(filterEvents(list, { ...noFilter(), source: 'mcp' }).map((e) => e.id)).toEqual([2])
    expect(filterEvents(list, { ...noFilter(), sessionId: 2 }).map((e) => e.id)).toEqual([3])
    expect(filterEvents(list, { ...noFilter(), level: 'error' }).map((e) => e.id)).toEqual([2])
    expect(filterEvents(list, { ...noFilter(), text: 'boom' }).map((e) => e.id)).toEqual([2])
  })
})

describe('appendEvents', () => {
  it('ignores known ids and caps the list', () => {
    const a = appendEvents([ev(1)], [ev(1), ev(2)])
    expect(a.map((e) => e.id)).toEqual([1, 2])
    expect(appendEvents(a, [ev(2)])).toBe(a)
    expect(appendEvents(a, [ev(3), ev(4)], 3).map((e) => e.id)).toEqual([2, 3, 4])
  })
})

describe('tree', () => {
  it('has logs and a node per chat', () => {
    const tree = logTree([{ id: 4, title: 'Fix bug' }, { id: 5, title: '' }])
    const logs = tree[0].children!.find((n) => n.id === ALL_NODE)!
    expect(logs.children!.map((n) => n.text)).toEqual(['ACP', 'AG-UI', 'MCP'])
    expect(tree[0].children!.find((n) => n.id === 'chats')!.children!.map((n) => n.text)).toEqual(['Fix bug', 'New chat'])
  })
  it('turns a node into a scope', () => {
    expect(nodeScope(sourceNode('ag-ui'))).toMatchObject({ source: 'ag-ui', sessionId: null })
    expect(nodeScope(chatNode(7))).toMatchObject({ source: null, sessionId: 7 })
    expect(nodeScope(null)).toMatchObject({ source: null, sessionId: null })
  })
})

describe('text', () => {
  it('summarises json-rpc errors and strings', () => {
    expect(summaryOf('{"error":{"message":"closed"}}')).toBe('closed')
    expect(summaryOf('{"params":{"text":"Looking at it"}}')).toBe('Looking at it')
    expect(summaryOf('not json')).toBe('not json')
  })
  it('builds the general lines', () => {
    const lines = generalLines(ev(9, { level: 'warning' }), 'Fix bug')
    expect(lines).toContainEqual(['Level', 'Warning'])
    expect(lines).toContainEqual(['Chat', 'Fix bug'])
  })
  it('finds the next match and wraps', () => {
    const list = [ev(1, { name: 'a' }), ev(2, { name: 'needle' }), ev(3, { name: 'b' })]
    expect(findNext(list, 'needle', -1)).toBe(1)
    expect(findNext(list, 'needle', 1)).toBe(1)
    expect(findNext(list, 'zzz', 0)).toBe(-1)
  })
})

describe('source hints', () => {
  it('explain the log names in plain words and sit on the tree nodes', () => {
    expect(SOURCE_HINT.acp).toBe('ACP: how Agent7 talks to the agent')
    const acp = logTree([]).flatMap((n) => n.children ?? []).flatMap((n) => n.children ?? []).find((n) => n.id === 'source:acp')
    expect(acp?.title).toBe(SOURCE_HINT.acp)
  })
})
