import { EventType } from '@ag-ui/core'
import type { AguiTerminalState } from '@shared/agui-state'
import type { ContentBlockDto } from '@shared/models'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentSessionEvent, ToolCallCreatedEvent } from '../../domain/agent/AgentSessionEvent'
import { AgentEventTranslator, type AguiEvent } from './AgentEventTranslator'
import { SessionStateModel } from './SessionStateModel'
import { expectValidStream, types } from './test-helpers'
import { emptyAguiState } from '@shared/agui-state'

let model: SessionStateModel
let translator: AgentEventTranslator
let counter: number
let terminals: Record<string, AguiTerminalState>

beforeEach(() => {
  model = new SessionStateModel(emptyAguiState())
  counter = 0
  terminals = {}
  translator = new AgentEventTranslator({
    newId: () => `id-${++counter}`,
    toolCall: (id) => model.current().toolCalls[id],
    terminal: (id) => terminals[id]
  })
})

const text = (value: string): ContentBlockDto => ({ kind: 'text', text: value })
const chunk = (role: 'agent' | 'thought' | 'user', value: string): AgentSessionEvent => ({
  type: 'message_chunk',
  role,
  block: text(value)
})
const created = (over: Partial<ToolCallCreatedEvent> = {}): ToolCallCreatedEvent => ({
  type: 'tool_call_created',
  toolCallId: 't1',
  title: 'Read file',
  toolKind: 'read',
  status: 'pending',
  rawInput: '{"path":"a.ts"}',
  rawOutput: null,
  locations: [],
  contents: [],
  ...over
})

/** Feeds events like the thread does: the shared state first, then the translator. */
function feed(...events: AgentSessionEvent[]): AguiEvent[] {
  return events.flatMap((event) => {
    if (event.type === 'tool_call_created') model.toolCallCreated(event)
    if (event.type === 'tool_call_updated') model.toolCallUpdated(event.toolCallId, event.patch)
    return translator.translate(event)
  })
}

const stream = async (events: AguiEvent[]): Promise<AguiEvent[]> => {
  const all: AguiEvent[] = [
    { type: EventType.RUN_STARTED, threadId: '1', runId: 'r' },
    ...events,
    ...translator.flush(),
    { type: EventType.RUN_FINISHED, threadId: '1', runId: 'r' }
  ]
  await expectValidStream(all)
  return all
}

describe('AgentEventTranslator: messages', () => {
  it('turns agent chunks into one text message', async () => {
    const events = feed(chunk('agent', 'Hel'), chunk('agent', 'lo'))
    expect(events).toEqual([
      { type: EventType.TEXT_MESSAGE_START, messageId: 'id-1', role: 'assistant' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'id-1', delta: 'Hel' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'id-1', delta: 'lo' }
    ])
    const all = await stream(events)
    expect(types(all).slice(-2)).toEqual([EventType.TEXT_MESSAGE_END, EventType.RUN_FINISHED])
  })

  it('turns thoughts into a reasoning message and ends it when text follows', async () => {
    const events = feed(chunk('thought', 'hmm'), chunk('agent', 'ok'))
    expect(types(events)).toEqual([
      EventType.REASONING_START,
      EventType.REASONING_MESSAGE_START,
      EventType.REASONING_MESSAGE_CONTENT,
      EventType.REASONING_MESSAGE_END,
      EventType.REASONING_END,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT
    ])
    expect(events[1]).toMatchObject({ role: 'reasoning' })
    await stream(events)
  })

  it('ignores user chunks (echoes) and empty chunks without disturbing the open message', () => {
    expect(feed(chunk('agent', 'a'), chunk('user', 'echo'), chunk('agent', ''), chunk('agent', 'b'))).toHaveLength(3)
  })

  it('describes non-text blocks as text', () => {
    const events = feed({ type: 'message_chunk', role: 'agent', block: { kind: 'resource_link', uri: 'file:///a', name: 'a', mimeType: null } })
    expect(events.at(-1)).toMatchObject({ delta: '[a](file:///a)' })
  })

  it('ends a message when a tool call interleaves and starts a new one afterwards', async () => {
    const events = feed(chunk('agent', 'Before'), created(), chunk('agent', 'After'))
    expect(types(events)).toEqual([
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.TOOL_CALL_START,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT
    ])
    // The tool call hangs off the text message before it; the text after it is a new message.
    expect(events[3]).toMatchObject({ parentMessageId: 'id-1' })
    expect(events[4]).toMatchObject({ messageId: 'id-2' })
    await stream(events)
  })
})

describe('AgentEventTranslator: tool calls', () => {
  it('starts on create (named by title, else kind) and sends args once, with the latest input, when it completes', async () => {
    const events = feed(
      created({ rawInput: '{}' }),
      { type: 'tool_call_updated', toolCallId: 't1', patch: { rawInput: '{"path":"a.ts"}', status: 'in_progress' } },
      {
        type: 'tool_call_updated',
        toolCallId: 't1',
        patch: { status: 'completed', contents: [{ kind: 'content', block: text('file body') }] }
      }
    )
    expect(events).toEqual([
      { type: EventType.TOOL_CALL_START, toolCallId: 't1', toolCallName: 'Read file', parentMessageId: 'id-1' },
      { type: EventType.TOOL_CALL_ARGS, toolCallId: 't1', delta: '{"path":"a.ts"}' },
      { type: EventType.TOOL_CALL_END, toolCallId: 't1' },
      { type: EventType.TOOL_CALL_RESULT, messageId: 'id-2', toolCallId: 't1', role: 'tool', content: 'file body' }
    ])
    await stream(events)
  })

  it('falls back to the kind as name, and to {} args', () => {
    const events = feed(created({ title: '', toolKind: 'search', rawInput: null }))
    expect(events[0]).toMatchObject({ toolCallName: 'search' })
    expect(translator.flush()).toEqual([
      { type: EventType.TOOL_CALL_ARGS, toolCallId: 't1', delta: '{}' },
      { type: EventType.TOOL_CALL_END, toolCallId: 't1' }
    ])
  })

  it('shares the parent message between consecutive tool calls and uses a fresh one after reasoning', () => {
    const events = feed(
      created({ toolCallId: 'a' }),
      created({ toolCallId: 'b' }),
      chunk('thought', 'think'),
      created({ toolCallId: 'c' })
    )
    const parents = events.filter((e) => e.type === EventType.TOOL_CALL_START).map((e) => 'parentMessageId' in e && e.parentMessageId)
    expect(parents[0]).toBe(parents[1])
    expect(parents[2]).not.toBe(parents[0])
  })

  it('summarises diffs and terminals in the result, and reports failures', () => {
    terminals['term-1'] = { command: 'npm test', output: 'ok\n', exitCode: 0 }
    const events = feed(
      created({
        contents: [
          { kind: 'diff', path: 'a.ts', oldText: 'x\n', newText: 'x\ny\n' },
          { kind: 'diff', path: 'b.ts', oldText: null, newText: '1\n2\n' },
          { kind: 'terminal', terminalId: 'term-1' }
        ]
      }),
      { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'failed' } }
    )
    const result = events.find((e) => e.type === EventType.TOOL_CALL_RESULT)
    expect(result).toMatchObject({
      content: 'Edited a.ts (+1 -0)\nCreated b.ts (+2)\n$ npm test\nok\n(exit code 0)'
    })
  })

  it('uses the raw output, then the status, when there are no contents', () => {
    expect(
      feed(created(), { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed', rawOutput: '{"ok":true}' } }).at(-1)
    ).toMatchObject({ content: '{"ok":true}' })
    expect(
      feed(created({ toolCallId: 't2' }), { type: 'tool_call_updated', toolCallId: 't2', patch: { status: 'failed' } }).at(-1)
    ).toMatchObject({ content: 'The tool call failed' })
  })

  it('sends one result only, and none for status changes that are not final', () => {
    const events = feed(
      created(),
      { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'in_progress' } },
      { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed' } },
      { type: 'tool_call_updated', toolCallId: 't1', patch: { title: 'again' } }
    )
    expect(events.filter((e) => e.type === EventType.TOOL_CALL_RESULT)).toHaveLength(1)
  })

  it('flush closes open tool calls once; a later completion only adds the result', async () => {
    const first = [...feed(created()), ...translator.flush()]
    expect(types(first)).toEqual([EventType.TOOL_CALL_START, EventType.TOOL_CALL_ARGS, EventType.TOOL_CALL_END])
    expect(translator.flush()).toEqual([])
    const later = feed({ type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed' } })
    expect(types(later)).toEqual([EventType.TOOL_CALL_RESULT])
    await expectValidStream([
      { type: EventType.RUN_STARTED, threadId: '1', runId: 'r1' },
      ...first,
      { type: EventType.RUN_FINISHED, threadId: '1', runId: 'r1' },
      { type: EventType.RUN_STARTED, threadId: '1', runId: 'r2' },
      ...later,
      { type: EventType.RUN_FINISHED, threadId: '1', runId: 'r2' }
    ])
  })

  it('gives results for tool calls it never saw start (events missed while no run was attached)', () => {
    const events = feed({ type: 'tool_call_updated', toolCallId: 'ghost', patch: { status: 'completed', title: 'Ghost' } })
    expect(types(events)).toEqual([EventType.TOOL_CALL_RESULT])
  })

  it('reset forgets open elements without events', () => {
    feed(chunk('agent', 'x'), created())
    translator.reset()
    expect(translator.flush()).toEqual([])
  })

  it('keeps the shared state in step: kind, status, locations, contents', () => {
    feed(created({ locations: [{ path: 'a.ts', line: 3 }] }), {
      type: 'tool_call_updated',
      toolCallId: 't1',
      patch: { status: 'in_progress', toolKind: 'edit' }
    })
    expect(model.current().toolCalls['t1']).toMatchObject({
      kind: 'edit',
      status: 'in_progress',
      locations: [{ path: 'a.ts', line: 3 }]
    })
  })
})
