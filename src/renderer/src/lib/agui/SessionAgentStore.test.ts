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

  describe('a send that fails', () => {
    const calls: string[] = []
    beforeEach(() => {
      calls.length = 0
      store = new SessionAgentStore(5, api, () => ({
        retry: async () => (calls.push('retry'), true),
        restartAgent: async () => void calls.push('restart')
      }))
    })
    const failing = (input: RunAgentInput): object[] => [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.RUN_ERROR, message: 'ACP connection closed' }
    ]

    it('keeps the message, marks it unanswered and resolves false', async () => {
      api.script = failing
      expect(await store.send('go')).toBe(false)
      expect(store.failedSend).toMatchObject({ text: 'go', unanswered: true })
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
    })

    it('Send again withdraws the failed copy and sends one new message, so the transcript has it once', async () => {
      api.script = failing
      await store.send('go')
      api.script = (input) => bookends(input)
      expect(await store.resend()).toBe(true)
      expect(calls).toEqual(['retry'])
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
      expect(store.failedSend).toBeNull()
      expect(store.error).toBeNull()
    })

    it('the same text sent again from the box (after Reconnect) replaces the failed copy: one bubble per message (UX-162)', async () => {
      api.script = failing
      await store.send('list the files')
      expect(await store.send('list the files')).toBe(false)
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
      expect(store.failedSend).toMatchObject({ text: 'list the files', unanswered: true })
      expect(calls).toEqual(['retry'])
      api.script = (input) => bookends(input)
      expect(await store.send('list the files')).toBe(true)
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
      expect(store.failedSend).toBeNull()
    })

    it('another text leaves the failed message in place', async () => {
      api.script = failing
      await store.send('one')
      await store.send('two')
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(2)
    })

    it('a copy that came back from a reload under another id is taken back too', async () => {
      api.script = failing
      await store.send('go')
      const [only] = store.messages
      store['agent'].setMessages([{ ...only, id: 'reloaded' }])
      api.script = (input) => bookends(input)
      expect(await store.send('go')).toBe(true)
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
    })

    it('Restart and send again starts a fresh agent first', async () => {
      api.script = failing
      await store.send('go')
      api.script = (input) => bookends(input)
      await store.resend({ restart: true })
      expect(calls).toEqual(['restart', 'retry'])
    })

    // The agent answered with a step, then the turn failed: the message is not "unanswered".
    const halfway = (input: RunAgentInput): object[] => [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.TEXT_MESSAGE_START, messageId: 'a1', role: 'assistant' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'a1', delta: 'Working on it' },
      { type: EventType.TEXT_MESSAGE_END, messageId: 'a1' },
      { type: EventType.RUN_ERROR, message: 'Request timed out' }
    ]

    it('Send again after a cut-off turn keeps the first message and marks it Stopped once and the repeat Sent again (UX-201)', async () => {
      api.script = halfway
      await store.send('start the long job')
      const first = store.failedSend!
      expect(first.unanswered).toBe(false)
      api.script = (input) => bookends(input)
      expect(await store.resend()).toBe(true)
      const users = store.messages.filter((m) => m.role === 'user')
      expect(users).toHaveLength(2)
      expect([...store.stoppedIds]).toEqual([first.messageId])
      expect([...store.resentIds]).toEqual([users[1].id])
      expect(calls).toEqual([])
    })

    it('Send again after a message nobody answered marks nothing: the failed copy is replaced', async () => {
      api.script = failing
      await store.send('go')
      api.script = (input) => bookends(input)
      await store.resend()
      expect(store.stoppedIds.size).toBe(0)
      expect(store.resentIds.size).toBe(0)
    })

    it('Reconnect does not send the failed request again and says which one it is (UX-195)', async () => {
      api.script = halfway
      await store.send('start the long job')
      api.script = (input) => bookends(input)
      await store.reconnect()
      expect(store.notResent).toBe('start the long job')
      expect(calls).toEqual(['restart'])
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(1)
      // A new send clears the line.
      await store.send('hello')
      expect(store.notResent).toBeNull()
    })

    it('says nothing about the request when the user ended the program on purpose (UX-201)', async () => {
      api.script = halfway
      await store.send('start the long job')
      api.script = (input) => bookends(input)
      await store.reconnect({ announce: false })
      expect(store.notResent).toBeNull()
    })

    it('has nothing to say about a Reconnect when no request failed', async () => {
      api.script = (input) => bookends(input)
      await store.reconnect()
      expect(store.notResent).toBeNull()
    })

    it('"Start a new chat" marks this chat as continued until it runs again (UX-201)', async () => {
      api.script = failing
      await store.send('go')
      store.markContinued()
      expect(store.continued).toBe(true)
      api.script = (input) => bookends(input)
      await store.send('again')
      expect(store.continued).toBe(false)
    })

    it('Edit takes the message back and returns it for the composer', async () => {
      api.script = failing
      await store.send('go', ['/a.txt'])
      const back = await store.takeBack()
      expect(back).toMatchObject({ text: 'go', attachments: ['/a.txt'] })
      expect(store.messages.filter((m) => m.role === 'user')).toHaveLength(0)
      expect(store.failedSend).toBeNull()
    })
  })

  it('remembers a denied tool call and a stopped turn', async () => {
    api.script = (input) => bookends(input).map((e, i) => (i === 1 ? { ...e, ...interruptOutcome('9') } : e))
    await store.send('go')
    api.script = (input) => bookends(input)
    await store.resolveInterrupt(null)
    expect(store.deniedToolCalls.has('t1')).toBe(true)
    expect(store.stoppedByUser).toBe(false)
    await store.cancel()
    expect(store.stoppedByUser).toBe(true)
    await store.send('again')
    expect(store.stoppedByUser).toBe(false)
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

  it('reload forgets messages, open interrupts and tool calls after the transcript was cleared', async () => {
    const card = { title: 'Edit', kind: 'edit', status: 'in_progress', rawInput: null, locations: [], contents: [] }
    api.script = (input) =>
      bookends(
        input,
        { type: EventType.MESSAGES_SNAPSHOT, messages: [{ id: 'a1', role: 'assistant', toolCalls: [{ id: 't1', type: 'function', function: { name: 'Edit', arguments: '{}' } }] }] },
        { type: EventType.STATE_SNAPSHOT, snapshot: { session: { title: 'T' }, tasks: [], changes: [], toolCalls: { t1: card }, terminals: {} } }
      )
    await store.connect()
    expect(store.messages).toHaveLength(1)
    expect(Object.keys(store.state.toolCalls)).toEqual(['t1'])

    api.script = (input) =>
      bookends(input, { type: EventType.MESSAGES_SNAPSHOT, messages: [] }, { type: EventType.STATE_SNAPSHOT, snapshot: { session: { title: 'T' }, tasks: [], changes: [], toolCalls: {}, terminals: {} } })
    await store.reload()
    expect(store.messages).toEqual([])
    expect(store.state.toolCalls).toEqual({})
    expect(store.interrupts).toEqual([])
  })
})
