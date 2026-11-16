import { EventType, type BaseEvent, type RunAgentInput } from '@ag-ui/core'
import type { AguiApi } from '@shared/ipc'
import { beforeEach, describe, expect, it } from 'vitest'
import { SessionAgentStore } from './SessionAgentStore.svelte'

class FakeAguiApi implements AguiApi {
  readonly runs: RunAgentInput[] = []
  readonly aborts: [string, string][] = []
  private readonly listeners = new Map<string, (event: BaseEvent) => void>()
  script: (input: RunAgentInput) => object[] = () => []

  onEvent(runId: string, listener: (event: BaseEvent) => void): () => void {
    this.listeners.set(runId, listener)
    return () => void this.listeners.delete(runId)
  }

  async run(input: RunAgentInput): Promise<void> {
    this.runs.push(input)
    for (const event of this.script(input)) {
      await Promise.resolve()
      this.listeners.get(input.runId)?.(event as BaseEvent)
    }
  }

  async abort(threadId: string, runId: string): Promise<void> {
    this.aborts.push([threadId, runId])
  }
}

let api: FakeAguiApi
let store: SessionAgentStore

beforeEach(() => {
  api = new FakeAguiApi()
  store = new SessionAgentStore(5, api)
})

const bookends = (input: RunAgentInput, ...middle: object[]): object[] => [
  { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
  ...middle,
  { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId }
]
const interruptOutcome = (id: string): object => ({
  outcome: { type: 'interrupt', interrupts: [{ id, reason: 'tool_permission', toolCallId: 't1' }] }
})

describe('SessionAgentStore', () => {
  it('connect mirrors the snapshots into reactive state and surfaces A2UI activities', async () => {
    api.script = (input) =>
      bookends(
        input,
        {
          type: EventType.MESSAGES_SNAPSHOT,
          messages: [
            { id: 'm1', role: 'user', content: 'hi' },
            { id: 'a2ui:s1', role: 'activity', activityType: 'a2ui-surface', content: { surfaceId: 's1', messages: [] } }
          ]
        },
        { type: EventType.STATE_SNAPSHOT, snapshot: { session: { title: 'Hello' }, tasks: [], changes: [], toolCalls: {}, terminals: {} } }
      )
    await store.connect()

    expect(api.runs[0]?.threadId).toBe('5')
    expect(store.messages).toHaveLength(2)
    expect(store.state.session.title).toBe('Hello')
    expect([...store.activities.keys()]).toEqual(['s1'])
    expect(store.running).toBe(false)
    expect(store.error).toBeNull()
  })

  it('send adds the user message, streams the answer and reports running while it streams', async () => {
    let wasRunning = false
    api.script = (input) => {
      wasRunning = store.running
      return bookends(
        input,
        { type: EventType.TEXT_MESSAGE_START, messageId: 'a1', role: 'assistant' },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'a1', delta: 'Hi!' },
        { type: EventType.TEXT_MESSAGE_END, messageId: 'a1' }
      )
    }
    await store.send('Hello', ['/tmp/a b.txt'])

    expect(wasRunning).toBe(true)
    expect(api.runs[0]?.messages[0]).toMatchObject({
      role: 'user',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'document', source: { type: 'url', value: 'file:///tmp/a%20b.txt' } }
      ]
    })
    expect(store.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(store.running).toBe(false)
  })

  it('exposes the pending interrupt and resumes the run when it is resolved', async () => {
    api.script = (input) => bookends(input).map((e, i) => (i === 1 ? { ...e, ...interruptOutcome('9') } : e))
    await store.send('go')
    expect(store.pendingInterrupt).toMatchObject({ id: '9', toolCallId: 't1' })

    await store.send('ignored while a permission request is open')
    expect(api.runs).toHaveLength(1)

    api.script = (input) => bookends(input)
    await store.resolveInterrupt('allow')
    expect(api.runs[1]?.resume).toEqual([{ interruptId: '9', status: 'resolved', payload: { optionId: 'allow' } }])
    expect(store.pendingInterrupt).toBeNull()
    expect(store.interrupts).toEqual([])
  })

  it('dismissing an interrupt sends a cancelled resume entry', async () => {
    api.script = (input) => bookends(input).map((e, i) => (i === 1 ? { ...e, ...interruptOutcome('4') } : e))
    await store.send('go')
    api.script = (input) => bookends(input)
    await store.resolveInterrupt(null)
    expect(api.runs[1]?.resume).toEqual([{ interruptId: '4', status: 'cancelled' }])
  })

  it('sendA2uiAction runs with the action in forwardedProps and no new message', async () => {
    api.script = (input) => bookends(input)
    const action = { surfaceId: 's1', sourceComponentId: 'ok', action: { name: 'submit' }, dataModel: {}, timestamp: 't' }
    await store.sendA2uiAction(action)
    expect(api.runs[0]?.forwardedProps).toEqual({ a2uiAction: action })
    expect(store.messages).toEqual([])
  })

  it('records run errors', async () => {
    api.script = (input) => [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.RUN_ERROR, message: 'agent crashed' }
    ]
    await store.send('go')
    expect(store.error).toBe('agent crashed')
    expect(store.running).toBe(false)
  })

  it('cancel aborts the thread; with a suspended permission request it reconnects afterwards', async () => {
    api.script = (input) => bookends(input).map((e, i) => (i === 1 ? { ...e, ...interruptOutcome('2') } : e))
    await store.send('go')
    api.script = (input) => bookends(input, { type: EventType.MESSAGES_SNAPSHOT, messages: [] })
    await store.cancel()

    expect(api.aborts).toEqual([['5', expect.any(String)]])
    expect(api.runs).toHaveLength(2) // the reconnect
    expect(store.interrupts).toEqual([])
  })
})
