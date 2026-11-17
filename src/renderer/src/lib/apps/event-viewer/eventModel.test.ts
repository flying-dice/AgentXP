import { describe, expect, it } from 'vitest'
import type { ProtocolEventDto } from '@shared/desktop'
import { SOURCE_HINT, START_FAILED, hiddenText, lastFinished, rawLines, shownText, whatHappened, whatToDo, ALL_NODE, eventView, lastProblem, FALLBACK_COUNT, appendEvents, chatNode, eventForToolCall, filterEvents, findNext, generalLines, logTree, noFilter, nodeScope, sourceNode, summaryOf } from './eventModel'

const ev = (id: number, over: Partial<ProtocolEventDto> = {}): ProtocolEventDto => ({ id, at: '2026-11-16T09:00:00Z', desktopId: 1, sessionId: 1, source: 'acp', direction: 'in', level: 'info', name: `m${id}`, payload: '{}', ...over })

describe('eventForToolCall', () => {
  const list = [ev(1, { payload: '{"toolCallId":"t1"}' }), ev(2, { payload: '{"toolCallId":"t2"}' }), ev(3, { level: 'error', payload: '{"toolCallId":"t1","status":"failed"}' }), ev(4, { payload: '{"toolCallId":"t1"}' })]
  it('prefers the error of the call, else the newest event that names it', () => {
    expect(eventForToolCall(list, 't1')?.id).toBe(3)
    expect(eventForToolCall(list, 't2')?.id).toBe(2)
  })
  it('is null when no event names the call', () => {
    expect(eventForToolCall(list, 'nope')).toBeNull()
    expect(eventForToolCall([], 't1')).toBeNull()
  })
})

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
    expect(tree[0]?.text).toBe('Event Viewer')
    const logs = tree[0].children!.find((n) => n.id === ALL_NODE)!
    expect(logs.children!.map((n) => n.text)).toEqual(['ACP', 'AG-UI', 'MCP', 'Task Scheduler'])
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
    expect(SOURCE_HINT.acp).toBe('ACP: how AgentXP talks to the agent')
    const acp = logTree([]).flatMap((n) => n.children ?? []).flatMap((n) => n.children ?? []).find((n) => n.id === 'source:acp')
    expect(acp?.title).toBe(SOURCE_HINT.acp)
  })
})

describe('eventView', () => {
  const infos = Array.from({ length: 27 }, (_, i) => ev(i + 1))
  it('shows warnings and errors first and counts what Show all adds', () => {
    const list = [...infos, ev(40, { level: 'error' })]
    const view = eventView(list, noFilter(), false)
    expect(view.shown.map((e) => e.id)).toEqual([40])
    expect(view.hidden).toBe(27)
    expect(view.latest).toBe(false)
  })
  it('shows the newest events when there is no warning or error, so the first view is not empty', () => {
    const view = eventView(infos, noFilter(), false)
    expect(view.shown).toHaveLength(FALLBACK_COUNT)
    expect(view.shown.at(-1)?.id).toBe(27)
    expect(view.hidden).toBe(27 - FALLBACK_COUNT)
    expect(view.latest).toBe(true)
  })
  it('shows everything with Show all or with a chosen level, and nothing for an empty log', () => {
    expect(eventView(infos, noFilter(), true).shown).toHaveLength(27)
    expect(eventView(infos, { ...noFilter(), level: 'info' }, false).hidden).toBe(0)
    expect(eventView([], noFilter(), false)).toEqual({ shown: [], hidden: 0, latest: false })
  })
})

describe('lastProblem', () => {
  it('names the newest warning or error with its own message', () => {
    const list = [ev(1, { level: 'error', payload: '{"error":{"message":"Old"}}' }), ev(2, { level: 'warning', payload: '{"error":{"message":"Drive E: was removed"}}' }), ev(3)]
    expect(lastProblem(list)).toEqual({ level: 'warning', text: 'Drive E: is not plugged in on this desktop.' })
  })
  it('is null without a warning or an error, and falls back to a plain sentence', () => {
    expect(lastProblem([ev(1)])).toBeNull()
    expect(lastProblem([ev(1, { level: 'error', name: 'session/prompt', payload: '{}' })])?.text).toBe('The agent reported a problem')
  })
})

describe('problem sentences (UX-188)', () => {
  it('never shows a protocol word', () => {
    expect(lastProblem([ev(1, { source: 'ag-ui', level: 'error', name: 'RUN_ERROR', payload: '{"type":"RUN_ERROR","message":"Internal error"}' })])?.text).toBe('The agent stopped unexpectedly')
    expect(lastProblem([ev(1, { level: 'error', payload: '{"error":{"message":"Query closed before response received"}}' })])?.text).toBe('The connection dropped')
    expect(lastProblem([ev(1, { level: 'warning', name: 'session/cancel' })])?.text).toBe('The agent was stopped')
  })
  it('says "Drive E: was removed" for a drive that is not plugged in, whole', () => {
    const message = 'Drive E: is not plugged in on this desktop. Ask the user to plug the project in, or work on C:.'
    expect(lastProblem([ev(1, { level: 'warning', source: 'mcp', payload: JSON.stringify({ content: [{ type: 'text', text: message }] }) })])?.text).toBe('Drive E: is not plugged in on this desktop.')
  })
  it('drops the problem of a chat once the same chat finished a later turn, but not of another chat', () => {
    const error = ev(1, { source: 'ag-ui', level: 'error', name: 'RUN_ERROR' })
    expect(lastProblem([error, ev(2, { source: 'ag-ui', name: 'RUN_FINISHED' })])).toBeNull()
    expect(lastProblem([error, ev(2, { sessionId: 2, source: 'ag-ui', name: 'RUN_FINISHED' })])?.level).toBe('error')
    expect(lastProblem([ev(1, { sessionId: null, level: 'warning' }), ev(2, { name: 'RUN_FINISHED' })])?.level).toBe('warning')
  })
})

describe('a warning is not hidden by a later event (UX-212)', () => {
  it('keeps a warning of a chat that finished a later turn', () => {
    const drive = ev(1, { level: 'warning', source: 'mcp', payload: JSON.stringify({ content: [{ type: 'text', text: 'Drive E: is not plugged in on this desktop.' }] }) })
    expect(lastProblem([drive, ev(2, { name: 'RUN_FINISHED' })])?.text).toBe('Drive E: is not plugged in on this desktop.')
    expect(lastProblem([drive, ev(2, { name: 'RUN_FINISHED' }), ev(3, { name: 'tools/call' })])?.level).toBe('warning')
  })
})

describe('lastFinished (UX-212)', () => {
  it('says what was last done, and is null only for an empty log', () => {
    expect(lastFinished([])).toBeNull()
    expect(lastFinished([ev(1)])).toBe('The agent is connected. Nothing was asked yet.')
    expect(lastFinished([ev(1), ev(2, { source: 'ag-ui', name: 'RUN_FINISHED' })])).toBe('The agent finished its last turn.')
  })
  it('names an error that the chat recovered from', () => {
    const error = ev(1, { source: 'ag-ui', level: 'error', name: 'RUN_ERROR', payload: '{"message":"The connection dropped"}' })
    expect(lastProblem([error, ev(2, { source: 'ag-ui', name: 'RUN_FINISHED' })])).toBeNull()
    expect(lastFinished([error, ev(2, { source: 'ag-ui', name: 'RUN_FINISHED' })])).toBe('Recovered: The connection dropped. The chat finished a later turn.')
  })
})

describe('plain sentences for the rows (UX-213)', () => {
  const start = ev(1, { level: 'error', name: 'session/new', direction: 'in', payload: '{"error":{"message":"Internal error"}}' })
  it('says that the program stopped before it was ready, not "Internal error", and what to do', () => {
    expect(whatHappened(start)).toBe(START_FAILED)
    expect(whatHappened(ev(2, { level: 'error', name: 'session/new', payload: '{"error":{"message":"Query closed before response received"}}' }))).toBe(START_FAILED)
    expect(whatToDo(start)).toContain('choose another agent')
  })
  it('gives no sentence to the traffic of the logs', () => {
    expect(whatHappened(ev(3))).toBe('')
    expect(whatToDo(ev(3))).toBe('')
  })
  it('moves the raw names to the Details tab for a warning or an error', () => {
    expect(generalLines(start, 'Chat').map(([k]) => k)).not.toContain('Event')
    expect(rawLines(start)).toContainEqual(['Event', 'session/new'])
    expect(generalLines(ev(4), 'Chat').map(([k]) => k)).toContain('Event')
  })
  it('counts what is shown and what is hidden in words', () => {
    expect(shownText([ev(1, { level: 'warning' })])).toBe('1 warning shown')
    expect(shownText([ev(1, { level: 'error' }), ev(2, { level: 'warning' }), ev(3, { level: 'warning' })])).toBe('1 error and 2 warnings shown')
    expect(hiddenText(25)).toBe('25 other events hidden: Show all')
    expect(hiddenText(1)).toBe('1 other event hidden: Show all')
  })
})

describe('the Task Scheduler log', () => {
  const task = (id: number, taskId: number, name: string, level: ProtocolEventDto['level'], message: string): ProtocolEventDto =>
    ev(id, { source: 'scheduler', direction: 'out', sessionId: null, name, level, payload: JSON.stringify({ message, task: 'Review', taskId }) })

  it('is a log of its own in the tree', () => {
    expect(SOURCE_HINT.scheduler).toContain('scheduled tasks')
    expect(nodeScope(sourceNode('scheduler'))).toMatchObject({ source: 'scheduler', title: 'Task Scheduler' })
    expect(JSON.stringify(logTree([]))).toContain('source:scheduler')
  })
  it('shows the message of the event as the sentence and sends the reader to the History tab', () => {
    const failed = task(1, 7, 'task/failed', 'error', 'The task "Review" failed: The agent stopped.')
    expect(whatHappened(failed)).toBe('The task "Review" failed: The agent stopped.')
    expect(whatToDo(failed)).toContain('History tab')
  })
  it('drops a failure once a later run of the same task completed, not a run of another task', () => {
    const failed = task(1, 7, 'task/failed', 'error', 'The task "Review" failed.')
    expect(lastProblem([failed, task(2, 7, 'task/completed', 'info', 'done')])).toBeNull()
    expect(lastProblem([failed, task(2, 8, 'task/completed', 'info', 'done')])?.level).toBe('error')
    expect(lastFinished([failed, task(2, 7, 'task/completed', 'info', 'done')])).toBe('Recovered: The task "Review" failed. A later run of the task completed.')
  })
})
