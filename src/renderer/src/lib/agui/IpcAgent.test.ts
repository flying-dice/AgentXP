import { buildResumeArray } from '@ag-ui/client'
import { EventType, type BaseEvent, type RunAgentInput } from '@ag-ui/core'
import type { AguiSessionState } from '@shared/agui-state'
import type { AguiApi } from '@shared/ipc'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IpcAgent } from './IpcAgent'
import { pathToFileUrl } from './fileUrl'
import { surfacesOf } from './activities'

type Script = (input: RunAgentInput) => BaseEvent[] | Promise<BaseEvent[]>

/** A stand-in for window.agent7.agui: records calls and plays a script of events per run. */
class FakeAguiApi implements AguiApi {
  readonly runs: RunAgentInput[] = []
  readonly aborts: [string, string][] = []
  readonly listening = new Set<string>()
  private readonly listeners = new Map<string, (event: BaseEvent) => void>()
  script: Script = () => []
  failWith: Error | null = null

  onEvent(runId: string, listener: (event: BaseEvent) => void): () => void {
    this.listeners.set(runId, listener)
    this.listening.add(runId)
    return () => {
      this.listeners.delete(runId)
      this.listening.delete(runId)
    }
  }

  async run(input: RunAgentInput): Promise<void> {
    expect(this.listeners.has(input.runId)).toBe(true) // subscribed before the invoke
    this.runs.push(input)
    if (this.failWith) throw this.failWith
    for (const event of await this.script(input)) {
      await Promise.resolve()
      this.listeners.get(input.runId)?.(event)
    }
  }

  async abort(threadId: string, runId: string): Promise<void> {
    this.aborts.push([threadId, runId])
  }
}

let api: FakeAguiApi
let agent: IpcAgent

beforeEach(() => {
  api = new FakeAguiApi()
  agent = new IpcAgent(api, { threadId: '7' })
})

const started = (input: RunAgentInput): BaseEvent => ({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId })
const finished = (input: RunAgentInput, outcome?: object): BaseEvent => ({
  type: EventType.RUN_FINISHED,
  threadId: input.threadId,
  runId: input.runId,
  ...(outcome ? { outcome } : {})
})
const ev = (event: object): BaseEvent => event as BaseEvent

describe('IpcAgent', () => {
  it('connectAgent sends a bare run on the session thread and applies the snapshots', async () => {
    const state = { session: { title: 'T' }, toolCalls: {} }
    api.script = (input) => [
      started(input),
      ev({ type: EventType.MESSAGES_SNAPSHOT, messages: [{ id: 'm1', role: 'user', content: 'hi' }] }),
      ev({ type: EventType.STATE_SNAPSHOT, snapshot: state }),
      finished(input)
    ]
    await agent.connectAgent()

    expect(api.runs).toHaveLength(1)
    expect(api.runs[0]).toMatchObject({ threadId: '7', messages: [] })
    expect(api.runs[0]).not.toHaveProperty('resume')
    expect(agent.messages).toEqual([{ id: 'm1', role: 'user', content: 'hi' }])
    expect(agent.state).toEqual(state)
    expect(api.listening.size).toBe(0) // unsubscribed after RUN_FINISHED
  })

  it('streams a prompt into messages and shared state (text, tool call, state delta)', async () => {
    agent.addMessage({ id: 'u1', role: 'user', content: 'Do it' })
    api.script = (input) => [
      started(input),
      ev({ type: EventType.STATE_SNAPSHOT, snapshot: { session: { status: 'idle' }, toolCalls: {} } }),
      ev({ type: EventType.TEXT_MESSAGE_START, messageId: 'a1', role: 'assistant' }),
      ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'a1', delta: 'Hel' }),
      ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'a1', delta: 'lo' }),
      ev({ type: EventType.TEXT_MESSAGE_END, messageId: 'a1' }),
      ev({ type: EventType.TOOL_CALL_START, toolCallId: 't1', toolCallName: 'Read', parentMessageId: 'a1' }),
      ev({ type: EventType.STATE_DELTA, delta: [{ op: 'add', path: '/toolCalls/t1', value: { status: 'pending' } }] }),
      ev({ type: EventType.TOOL_CALL_ARGS, toolCallId: 't1', delta: '{"p":1}' }),
      ev({ type: EventType.TOOL_CALL_END, toolCallId: 't1' }),
      ev({ type: EventType.TOOL_CALL_RESULT, messageId: 'r1', toolCallId: 't1', role: 'tool', content: 'ok' }),
      finished(input)
    ]
    await agent.runAgent()

    expect(api.runs[0]?.messages).toEqual([{ id: 'u1', role: 'user', content: 'Do it' }])
    expect(agent.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(agent.messages[1]).toMatchObject({ content: 'Hello', toolCalls: [{ id: 't1', function: { name: 'Read', arguments: '{"p":1}' } }] })
    expect((agent.state as AguiSessionState).toolCalls['t1']).toEqual({ status: 'pending' })
  })

  it('keeps the interrupt of a run and sends the resume entries on the next run', async () => {
    agent.addMessage({ id: 'u1', role: 'user', content: 'Do it' })
    const interrupt = { id: '12', reason: 'tool_permission', toolCallId: 't1', message: 'Allow?' }
    api.script = (input) => [started(input), finished(input, { type: 'interrupt', interrupts: [interrupt] })]
    await agent.runAgent()
    expect(agent.pendingInterrupts).toEqual([interrupt])
    expect(agent.isRunning).toBe(false)

    api.script = (input) => [started(input), finished(input, { type: 'success' })]
    await agent.runAgent({
      resume: buildResumeArray(agent.pendingInterrupts, { '12': { status: 'resolved', payload: { optionId: 'allow' } } })
    })
    expect(api.runs[1]?.resume).toEqual([{ interruptId: '12', status: 'resolved', payload: { optionId: 'allow' } }])
    expect(api.runs[1]?.threadId).toBe('7')
    expect(agent.pendingInterrupts).toEqual([])
  })

  it('refuses a new run while an interrupt is unanswered', async () => {
    api.script = (input) => [started(input), finished(input, { type: 'interrupt', interrupts: [{ id: '1', reason: 'tool_permission' }] })]
    await agent.runAgent()
    await expect(agent.runAgent()).rejects.toThrow(/pending interrupt/)
    expect(api.runs).toHaveLength(1)
  })

  it('forwards forwardedProps (A2UI actions) to the backend', async () => {
    api.script = (input) => [started(input), finished(input)]
    await agent.runAgent({ forwardedProps: { a2uiAction: { surfaceId: 's' } } })
    expect(api.runs[0]?.forwardedProps).toEqual({ a2uiAction: { surfaceId: 's' } })
  })

  it('reports RUN_ERROR to subscribers, ends the run and stops listening', async () => {
    const errors: string[] = []
    agent.subscribe({ onRunErrorEvent: ({ event }) => void errors.push(event.message) })
    api.script = (input) => [started(input), ev({ type: EventType.RUN_ERROR, message: 'agent crashed' })]
    await agent.runAgent()
    expect(errors).toEqual(['agent crashed'])
    expect(api.listening.size).toBe(0)
    expect(agent.isRunning).toBe(false)
  })

  it('fails the run when the invoke rejects', async () => {
    api.failWith = new Error('Invalid RunAgentInput')
    await expect(agent.runAgent()).rejects.toThrow('Invalid RunAgentInput')
    expect(api.listening.size).toBe(0)
  })

  it('completes when the invoke resolves without a terminal event (safety net)', async () => {
    api.script = (input) => [started(input)]
    await agent.runAgent()
    expect(api.listening.size).toBe(0)
  })

  it('abort sends the thread id and the id of the last run', async () => {
    api.script = (input) => [started(input), finished(input)]
    await agent.runAgent({ runId: 'run-x' })
    await agent.abort()
    agent.abortRun()
    expect(api.aborts).toEqual([
      ['7', 'run-x'],
      ['7', 'run-x']
    ])
  })

  it('clone keeps the transport', async () => {
    api.script = (input) => [started(input), finished(input)]
    await agent.clone().runAgent()
    expect(api.runs).toHaveLength(1)
  })
})

describe('IpcAgent with the global window.agent7', () => {
  const holder = globalThis as unknown as { window?: unknown }
  afterEach(() => {
    delete holder.window
  })

  it('defaults to window.agent7.agui', async () => {
    holder.window = { agent7: { agui: api } }
    api.script = (input) => [started(input), finished(input)]
    await new IpcAgent(undefined, { threadId: '3' }).connectAgent()
    expect(api.runs[0]?.threadId).toBe('3')
  })
})

describe('pathToFileUrl', () => {
  it('encodes POSIX and Windows paths', () => {
    expect(pathToFileUrl('/tmp/a b/c#d.txt')).toBe('file:///tmp/a%20b/c%23d.txt')
    expect(pathToFileUrl('C:\\Users\\me\\a b.txt')).toBe('file:///C:/Users/me/a%20b.txt')
  })
})

describe('surfacesOf', () => {
  it('lists live A2UI activity messages by surface id and drops deleted ones', () => {
    const activity = (id: string, content: object, activityType = 'a2ui-surface'): never =>
      ({ id, role: 'activity', activityType, content }) as never
    const surfaces = surfacesOf([
      { id: 'u', role: 'user', content: 'x' },
      activity('a2ui:s1', { surfaceId: 's1', messages: [{ version: 'v0.9' }] }),
      activity('a2ui:s2', { surfaceId: 's2', messages: [] }),
      activity('a2ui:s2', { surfaceId: 's2', deleted: true, messages: [] }),
      activity('other', { surfaceId: 's3', messages: [] }, 'something-else')
    ])
    expect([...surfaces.keys()]).toEqual(['s1'])
    expect(surfaces.get('s1')).toEqual({ messageId: 'a2ui:s1', surfaceId: 's1', messages: [{ version: 'v0.9' }] })
  })
})
