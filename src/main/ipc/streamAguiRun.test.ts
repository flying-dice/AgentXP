import { EventType, type RunAgentInput } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'
import type { AguiEventMessage } from '../../shared/ipc'
import type { AguiEvent } from '../application/agui/AgentEventTranslator'
import type { AguiRunner } from '../application/agui/AguiRunCoordinator'
import { parseRunInput, streamAguiRun } from './streamAguiRun'

const input = { threadId: '1', runId: 'r1', messages: [], tools: [], context: [], state: {} } as RunAgentInput

const runnerOf = (events: AguiEvent[], failWith?: Error): AguiRunner => ({
  async *run() {
    yield* events
    if (failWith) throw failWith
  },
  abort: async () => {}
})

const started: AguiEvent = { type: EventType.RUN_STARTED, threadId: '1', runId: 'r1' }
const finished: AguiEvent = { type: EventType.RUN_FINISHED, threadId: '1', runId: 'r1' }

async function stream(runner: AguiRunner, validate: boolean, isClosed = () => false): Promise<AguiEventMessage[]> {
  const sent: AguiEventMessage[] = []
  await streamAguiRun(runner, input, (m) => sent.push(m), { validate, isClosed })
  return sent
}

describe('streamAguiRun', () => {
  it('sends every event tagged with the run id', async () => {
    const sent = await stream(runnerOf([started, finished]), true)
    expect(sent).toEqual([
      { runId: 'r1', event: started },
      { runId: 'r1', event: finished }
    ])
  })

  it('turns an event that fails schema validation into RUN_ERROR and stops (validation on)', async () => {
    const invalid = { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm' } as unknown as AguiEvent
    const sent = await stream(runnerOf([started, invalid, finished]), true)
    expect(sent.map((m) => m.event.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR])
    expect(sent[1]?.event).toMatchObject({ message: expect.stringContaining('Invalid AG-UI event TEXT_MESSAGE_CONTENT') })
  })

  it('passes events through unchecked when validation is off', async () => {
    const invalid = { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm' } as unknown as AguiEvent
    expect(await stream(runnerOf([invalid]), false)).toHaveLength(1)
  })

  it('reports a failing runner as RUN_ERROR', async () => {
    const sent = await stream(runnerOf([started], new Error('boom')), false)
    expect(sent.at(-1)?.event).toMatchObject({ type: EventType.RUN_ERROR, message: 'boom' })
  })

  it('stops sending and detaches when the receiver is gone', async () => {
    let closed = false
    let returned = false
    const runner: AguiRunner = {
      async *run() {
        try {
          yield started
          yield finished
        } finally {
          returned = true
        }
      },
      abort: async () => {}
    }
    const sent: AguiEventMessage[] = []
    await streamAguiRun(runner, input, (m) => (sent.push(m), (closed = true)), { validate: false, isClosed: () => closed })
    expect(sent).toHaveLength(1)
    expect(returned).toBe(true)
  })
})

describe('parseRunInput', () => {
  it('accepts what an AG-UI client sends: messages with parts, state, forwarded props and resume entries', () => {
    const raw = {
      threadId: '3',
      runId: 'r',
      protocolVersion: '1.0',
      state: { session: { title: 'x' } },
      tools: [],
      context: [],
      forwardedProps: { a2uiAction: { surfaceId: 's' } },
      messages: [
        { id: 'u', role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'document', source: { type: 'url', value: 'file:///a' } }] },
        { id: 'a', role: 'assistant', content: 'ok', toolCalls: [{ id: 't', type: 'function', function: { name: 'n', arguments: '{}' } }] },
        { id: 'r1', role: 'reasoning', content: 'hmm' },
        { id: 'tm', role: 'tool', toolCallId: 't', content: 'done' }
      ],
      resume: [{ interruptId: '1', status: 'resolved', payload: { optionId: 'allow' } }]
    }
    expect(parseRunInput(raw)).toMatchObject({ threadId: '3', resume: [{ interruptId: '1' }], forwardedProps: raw.forwardedProps })
  })

  it('rejects malformed input with a readable error', () => {
    expect(() => parseRunInput({ threadId: 3 })).toThrow(/Invalid RunAgentInput/)
  })
})
