import { buildResumeArray, type RunAgentInput } from '@ag-ui/client'
import { EventType, type Event, type Interrupt, type Message } from '@ag-ui/core'
import { A2UI_ACTIVITY_TYPE, type AguiSessionState } from '@shared/agui-state'
import { DESKTOP_CONTEXT_DESCRIPTION, type DesktopState } from '@shared/desktop'
import type { A2uiClientEvent } from '@shared/a2ui'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import { FanOutEventPublisher } from '../FanOutEventPublisher'
import { PermissionBroker } from '../PermissionBroker'
import { SessionBroadcaster } from '../SessionBroadcaster'
import { SessionEventBus } from '../SessionEventBus'
import { SessionQueryService } from '../SessionQueryService'
import type { PromptTurnInput } from '../SessionService'
import { createAppFixture } from '../test-helpers'
import { ToolCallDiffs } from '../vfs/ToolCallDiffs'
import { AguiRunCoordinator } from './AguiRunCoordinator'
import { collect, expectValidStream, RunnerAgent, types } from './test-helpers'

let f: ReturnType<typeof createAppFixture>
let bus: SessionEventBus
let fan: FanOutEventPublisher
let broker: PermissionBroker
let broadcaster: SessionBroadcaster
let coordinator: AguiRunCoordinator
let script: (input: PromptTurnInput) => Promise<string>
let dispatched: A2uiClientEvent[]
let cancelled: number[]
let onCancel: () => void
let dispatchScript: (event: A2uiClientEvent) => Promise<void>
let counter: number

const options = [
  { optionId: 'allow', name: 'Allow', kind: 'allow_once' as const },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' as const }
]

beforeEach(() => {
  f = createAppFixture()
  bus = new SessionEventBus()
  fan = new FanOutEventPublisher(f.publisher)
  broadcaster = new SessionBroadcaster(f.repos.sessions, fan)
  broker = new PermissionBroker(
    f.repos.permissions,
    f.repos.transcripts,
    fan,
    broadcaster,
    (_id, toolCall) => toolCall,
    new ToolCallDiffs({ stat: async () => ({ kind: 'file' }) as never, readFile: async () => 'old\n' }, () => 1)
  )
  counter = 0
  dispatched = []
  cancelled = []
  onCancel = () => {}
  dispatchScript = async () => {}
  script = async () => 'end_turn'
  coordinator = new AguiRunCoordinator({
    queries: new SessionQueryService(f.repos.sessions, f.repos.transcripts, f.repos.tasks, f.repos.changes, f.repos.terminals, f.repos.surfaces),
    // Like SessionService: the session is idle again when its turn has ended.
    sessions: {
      promptTurn: async (input) => {
        try {
          return await script(input)
        } finally {
          broadcaster.setStatus(input.sessionId, 'idle')
        }
      },
      cancel: async (id) => (cancelled.push(id), onCancel())
    },
    a2ui: { dispatch: async (event) => (dispatched.push(event), dispatchScript(event)) },
    broker,
    events: bus,
    appEvents: fan,
    newId: () => `id-${++counter}`
  })
})

const threadId = (): string => String(f.sessionId)
const emit = (event: AgentSessionEvent): void => bus.publish(f.sessionId, event)
const chunk = (text: string): AgentSessionEvent => ({ type: 'message_chunk', role: 'agent', block: { kind: 'text', text } })
const toolCall = (over: Partial<Extract<AgentSessionEvent, { type: 'tool_call_created' }>> = {}): AgentSessionEvent => ({
  type: 'tool_call_created',
  toolCallId: 't1',
  title: 'Write file',
  toolKind: 'edit',
  status: 'pending',
  rawInput: '{"path":"a.txt"}',
  rawOutput: null,
  locations: [],
  contents: [],
  ...over
})

const input = (over: Partial<RunAgentInput> = {}): RunAgentInput => ({
  threadId: threadId(),
  runId: `run-${++counter}`,
  messages: [],
  tools: [],
  context: [],
  state: {},
  forwardedProps: {},
  ...over
})
const user = (text: string, id = `u-${++counter}`): Message => ({ id, role: 'user', content: text })

const ofType = <T extends Event['type']>(events: Event[], type: T): Extract<Event, { type: T }>[] =>
  events.filter((e): e is Extract<Event, { type: T }> => e.type === type)

const askPermission = (): Promise<unknown> =>
  broker.prompt(f.sessionId, { sessionKey: 'acp', toolCallId: 't1', toolCall: { title: 'Write file', toolKind: 'edit' }, options, signal: new AbortController().signal })

describe('AguiRunCoordinator: prompt', () => {
  it.each(['refusal', 'max_tokens'])('a turn that ends with stopReason %s adds a stop notice and the reason as RUN_FINISHED.result', async (reason) => {
    script = async () => {
      emit(chunk('Cut o'))
      return reason
    }
    const events = await collect(coordinator.run(input({ messages: [user('go')] })))
    await expectValidStream(events)
    const notices = ofType(events, EventType.ACTIVITY_SNAPSHOT)
    expect(notices).toHaveLength(1)
    expect(notices[0]).toMatchObject({ activityType: 'stop-notice', content: { reason } })
    const finished = ofType(events, EventType.RUN_FINISHED)[0]
    expect(finished).toMatchObject({ outcome: { type: 'success' }, result: { stopReason: reason } })
    expect(types(events).at(-2)).toBe(EventType.ACTIVITY_SNAPSHOT)
  })

  it('end_turn and cancelled add no stop notice', async () => {
    for (const reason of ['end_turn', 'cancelled']) {
      script = async () => reason
      const events = await collect(coordinator.run(input({ messages: [user(`go ${reason}`)] })))
      expect(ofType(events, EventType.ACTIVITY_SNAPSHOT)).toHaveLength(0)
    }
  })

  it('streams a turn: RUN_STARTED, state snapshot, messages, tool call, state deltas, RUN_FINISHED', async () => {
    let seenPrompt: PromptTurnInput | undefined
    script = async (prompt) => {
      seenPrompt = prompt
      broadcaster.setStatus(f.sessionId, 'working')
      emit(chunk('Working '))
      emit(chunk('on it'))
      emit(toolCall())
      fan.publish('tasks.changed', { sessionId: f.sessionId, tasks: [{ id: 1, sessionId: f.sessionId, position: 0, content: 'Do it', priority: 'high', status: 'in_progress' }] })
      emit({ type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed', contents: [{ kind: 'content', block: { kind: 'text', text: 'written' } }] } })
      broadcaster.setStatus(f.sessionId, 'idle')
      return 'end_turn'
    }
    const events = await collect(coordinator.run(input({ messages: [user('Please write')] })))

    await expectValidStream(events)
    expect(seenPrompt).toEqual({ sessionId: f.sessionId, text: 'Please write', attachments: [], desktopContext: null })
    expect(types(events)).toEqual([
      EventType.RUN_STARTED,
      EventType.STATE_SNAPSHOT,
      EventType.STATE_DELTA, // status: working
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.STATE_DELTA, // tool call state
      EventType.TEXT_MESSAGE_END,
      EventType.TOOL_CALL_START,
      EventType.STATE_DELTA, // tasks
      EventType.STATE_DELTA, // tool call completed
      EventType.TOOL_CALL_ARGS,
      EventType.TOOL_CALL_END,
      EventType.TOOL_CALL_RESULT,
      EventType.STATE_DELTA, // status: idle
      EventType.RUN_FINISHED
    ])
    expect(ofType(events, EventType.RUN_STARTED)[0]).toMatchObject({ threadId: threadId() })
    expect(ofType(events, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
    expect(ofType(events, EventType.TOOL_CALL_RESULT)[0]?.content).toBe('written')
  })

  it('passes file: URL attachments as paths and rejects other media', async () => {
    let seen: PromptTurnInput | undefined
    script = async (prompt) => ((seen = prompt), 'end_turn')
    const withFile: Message = {
      id: 'u-file',
      role: 'user',
      content: [
        { type: 'text', text: 'look' },
        { type: 'document', source: { type: 'url', value: 'file:///tmp/a%20b.txt' } }
      ]
    }
    await collect(coordinator.run(input({ messages: [withFile] })))
    expect(seen).toEqual({ sessionId: f.sessionId, text: 'look', attachments: ['/tmp/a b.txt'], desktopContext: null })

    const withImage: Message = {
      id: 'u-img',
      role: 'user',
      content: [{ type: 'image', source: { type: 'data', value: 'AAAA', mimeType: 'image/png' } }]
    }
    const events = await collect(coordinator.run(input({ messages: [withImage] })))
    expect(types(events)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR])
  })

  it('maps a cancelled turn to the cancelled outcome and a failed one to RUN_ERROR', async () => {
    script = async () => 'cancelled'
    const cancelledRun = await collect(coordinator.run(input({ messages: [user('a')] })))
    expect(ofType(cancelledRun, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'cancelled' })

    script = async () => {
      emit(chunk('partial'))
      throw new Error('agent crashed')
    }
    const failed = await collect(coordinator.run(input({ messages: [user('b')] })))
    await expectValidStream(failed)
    expect(types(failed).slice(-2)).toEqual([EventType.TEXT_MESSAGE_END, EventType.RUN_ERROR])
    expect(ofType(failed, EventType.RUN_ERROR)[0]?.message).toBe('agent crashed')
  })

  it('does not prompt twice for the same user message, and refuses a prompt while a turn runs', async () => {
    let prompts = 0
    let release: () => void = () => {}
    script = () => {
      prompts++
      return new Promise((resolve) => (release = () => resolve('end_turn')))
    }
    const first = input({ messages: [user('hi', 'same')] })
    const running = collect(coordinator.run(first))
    await new Promise((r) => setTimeout(r, 0))

    const busy = await collect(coordinator.run(input({ messages: [user('again')] })))
    expect(types(busy)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR])
    release()
    await running

    const replay = await collect(coordinator.run(input({ messages: first.messages })))
    expect(types(replay).at(-1)).toBe(EventType.RUN_FINISHED)
    expect(prompts).toBe(1) // the replay was a connect
    expect(types(replay)).toContain(EventType.MESSAGES_SNAPSHOT)
  })

  it('reports an unknown thread as RUN_ERROR', async () => {
    const events = await collect(coordinator.run(input({ threadId: 'nope' })))
    expect(types(events)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR])
    const missing = await collect(coordinator.run(input({ threadId: '9999' })))
    expect(ofType(missing, EventType.RUN_ERROR)[0]?.message).toBe('Session not found')
  })
})

describe('AguiRunCoordinator: permission interrupts', () => {
  beforeEach(() => {
    script = async () => {
      emit(chunk('About to write'))
      emit(toolCall())
      const decision = await askPermission()
      emit({ type: 'tool_call_updated', toolCallId: 't1', patch: { status: JSON.stringify(decision).includes('allow') ? 'completed' : 'failed' } })
      emit(chunk('Finished'))
      return 'end_turn'
    }
  })

  it('ends the run with an interrupt, keeps the turn suspended, and resumes the same turn', async () => {
    const first = input({ messages: [user('go')] })
    const run1 = await collect(coordinator.run(first))
    await expectValidStream(run1)

    const finished = ofType(run1, EventType.RUN_FINISHED)[0]!
    const outcome = finished.outcome
    if (outcome?.type !== 'interrupt') throw new Error('expected an interrupt outcome')
    const interrupt = outcome.interrupts[0] as Interrupt
    const request = f.repos.permissions.listPending(f.sessionId)[0]!
    expect(outcome.interrupts).toHaveLength(1)
    expect(interrupt).toMatchObject({
      id: String(request.id),
      reason: 'tool_permission',
      toolCallId: 't1',
      message: 'Allow "Write file"?',
      metadata: { requestId: request.id, title: 'Write file', toolKind: 'edit', options }
    })
    // The text message ended when the tool call started; the open tool call was closed before the run ended.
    expect(types(run1).slice(-5)).toEqual([
      EventType.TOOL_CALL_START,
      EventType.STATE_DELTA, // status: awaiting_permission
      EventType.TOOL_CALL_ARGS,
      EventType.TOOL_CALL_END,
      EventType.RUN_FINISHED
    ])
    expect(f.repos.sessions.get(f.sessionId)?.status).toBe('awaiting_permission')

    const run2 = await collect(
      coordinator.run(
        input({
          messages: [...first.messages],
          resume: [{ interruptId: interrupt.id, status: 'resolved', payload: { optionId: 'allow' } }]
        })
      )
    )
    await expectValidStream(run2)
    expect(types(run2)[1]).toBe(EventType.STATE_SNAPSHOT)
    expect(ofType(run2, EventType.TOOL_CALL_RESULT)[0]).toMatchObject({ toolCallId: 't1' })
    expect(ofType(run2, EventType.TEXT_MESSAGE_CONTENT)[0]?.delta).toBe('Finished')
    expect(ofType(run2, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
    expect(f.repos.permissions.listPending(f.sessionId)).toEqual([])
    expect(f.repos.permissions.get(request.id)).toMatchObject({ outcome: 'selected', selectedOptionId: 'allow' })
  })

  it('a cancelled resume entry dismisses the request', async () => {
    const first = input({ messages: [user('go')] })
    const run1 = await collect(coordinator.run(first))
    const interruptId = String(f.repos.permissions.listPending(f.sessionId)[0]!.id)
    expect(ofType(run1, EventType.RUN_FINISHED)[0]?.outcome?.type).toBe('interrupt')

    const run2 = await collect(coordinator.run(input({ messages: first.messages, resume: [{ interruptId, status: 'cancelled' }] })))
    expect(f.repos.permissions.get(Number(interruptId))).toMatchObject({ outcome: 'cancelled' })
    expect(types(run2).at(-1)).toBe(EventType.RUN_FINISHED)
  })

  it('a resume entry with a bad option is a RUN_ERROR and leaves the interrupt pending', async () => {
    const first = input({ messages: [user('go')] })
    await collect(coordinator.run(first))
    const interruptId = String(f.repos.permissions.listPending(f.sessionId)[0]!.id)
    const bad = await collect(
      coordinator.run(input({ messages: first.messages, resume: [{ interruptId, status: 'resolved', payload: { optionId: 'nope' } }] }))
    )
    expect(types(bad).at(-1)).toBe(EventType.RUN_ERROR)
    expect(f.repos.permissions.listPending(f.sessionId)).toHaveLength(1)
    const retry = await collect(
      coordinator.run(input({ messages: first.messages, resume: [{ interruptId, status: 'resolved', payload: { optionId: 'reject' } }] }))
    )
    expect(types(retry).at(-1)).toBe(EventType.RUN_FINISHED)
  })

  it('a connect while the turn is suspended reports the interrupt again; a stale resume with no turn behaves like a connect', async () => {
    const first = input({ messages: [user('go')] })
    await collect(coordinator.run(first))
    const pending = f.repos.permissions.listPending(f.sessionId)[0]!

    const reconnect = await collect(coordinator.run(input()))
    await expectValidStream(reconnect)
    expect(types(reconnect)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.STATE_SNAPSHOT,
      EventType.RUN_FINISHED
    ])
    expect(ofType(reconnect, EventType.RUN_FINISHED)[0]?.outcome).toMatchObject({ type: 'interrupt', interrupts: [{ id: String(pending.id) }] })

    // Resolve it behind the client's back and let the turn end; the client's resume is now stale.
    broker.respond(pending.id, 'reject')
    await new Promise((r) => setTimeout(r, 0))
    const stale = await collect(
      coordinator.run(input({ resume: [{ interruptId: String(pending.id), status: 'resolved', payload: { optionId: 'allow' } }] }))
    )
    expect(types(stale)).toContain(EventType.MESSAGES_SNAPSHOT)
    expect(ofType(stale, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
  })

  it('UX-114: the state the permission box reads has the old text the broker read (the agent sent the diff without it, then asked with a title only)', async () => {
    script = async () => {
      const contents = [{ kind: 'diff' as const, path: 'E:\\a.txt', oldText: null, newText: 'new\n' }]
      f.repos.transcripts.upsertToolCall(f.sessionId, { toolCallId: 't1', title: 'Write file', toolKind: 'edit', contents })
      emit(toolCall({ contents }))
      await askPermission()
      return 'end_turn'
    }
    const agent = new RunnerAgent(coordinator, threadId())
    agent.addMessage(user('go'))
    await agent.runAgent()
    expect(agent.pendingInterrupts).toHaveLength(1)
    const diff = (agent.state as AguiSessionState).toolCalls['t1']?.contents[0]
    expect(diff).toMatchObject({ kind: 'diff', oldText: 'old\n', newText: 'new\n' })
  })

  it('a real AG-UI client agent applies prompt, interrupt and resume to its messages and state', async () => {
    const agent = new RunnerAgent(coordinator, threadId())
    agent.addMessage(user('go'))
    await agent.runAgent()
    expect(agent.pendingInterrupts.map((i) => i.id)).toEqual([String(f.repos.permissions.listPending(f.sessionId)[0]!.id)])
    expect((agent.state as AguiSessionState).session.status).toBe('awaiting_permission')
    expect((agent.state as AguiSessionState).toolCalls['t1']).toMatchObject({ kind: 'edit', status: 'pending', title: 'Write file' })

    await agent.runAgent({
      resume: buildResumeArray(agent.pendingInterrupts, {
        [agent.pendingInterrupts[0]!.id]: { status: 'resolved', payload: { optionId: 'allow' } }
      })
    })
    expect(agent.pendingInterrupts).toEqual([])
    const state = agent.state as AguiSessionState
    expect(state.toolCalls['t1']?.status).toBe('completed')
    expect(state.session.status).toBe('idle') // the turn has ended (the session service sets idle)
    expect(agent.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant'])
    expect(agent.messages[1]).toMatchObject({ content: 'About to write', toolCalls: [{ id: 't1', function: { name: 'Write file', arguments: '{"path":"a.txt"}' } }] })
  })
})

describe('AguiRunCoordinator: connect', () => {
  it('sends the persisted transcript as messages, the state, and surfaces (inline, at their transcript slot)', async () => {
    const { transcripts, surfaces, tasks, sessions } = f.repos
    transcripts.appendMessage(f.sessionId, 'user', [
      { kind: 'text', text: 'Do things' },
      { kind: 'resource_link', uri: 'file:///w/a.txt', name: 'a.txt', mimeType: null }
    ])
    transcripts.appendChunk(f.sessionId, 'thought', { kind: 'text', text: 'thinking' })
    transcripts.appendChunk(f.sessionId, 'agent', { kind: 'text', text: 'On it' })
    transcripts.upsertToolCall(f.sessionId, {
      toolCallId: 't1',
      title: 'Edit a',
      toolKind: 'edit',
      status: 'completed',
      rawInput: '{"p":1}',
      contents: [{ kind: 'diff', path: 'a.txt', oldText: null, newText: 'hi\n' }]
    })
    transcripts.upsertToolCall(f.sessionId, { toolCallId: 't2', title: 'Run', toolKind: 'execute', status: 'in_progress' })
    surfaces.create(f.sessionId, { surfaceId: 's1', catalogId: 'cat', title: 'Form' })
    surfaces.upsertComponents(f.sessionId, 's1', [{ id: 'root', component: 'Button' }])
    transcripts.appendChunk(f.sessionId, 'agent', { kind: 'text', text: 'Done' })
    tasks.replace(f.sessionId, [{ content: 'Do it', priority: 'low', status: 'pending' }])
    sessions.setCurrentMode(f.sessionId, 'plan')

    const events = await collect(coordinator.run(input()))
    await expectValidStream(events)
    expect(types(events)).toEqual([EventType.RUN_STARTED, EventType.MESSAGES_SNAPSHOT, EventType.STATE_SNAPSHOT, EventType.RUN_FINISHED])

    const messages = ofType(events, EventType.MESSAGES_SNAPSHOT)[0]!.messages
    expect(messages.map((m) => m.role)).toEqual(['user', 'reasoning', 'assistant', 'tool', 'activity', 'assistant'])
    expect(messages[0]).toMatchObject({
      role: 'user',
      content: [
        { type: 'text', text: 'Do things' },
        { type: 'document', source: { type: 'url', value: 'file:///w/a.txt' } }
      ]
    })
    expect(messages[2]).toMatchObject({
      role: 'assistant',
      content: 'On it',
      toolCalls: [
        { id: 't1', function: { name: 'Edit a', arguments: '{"p":1}' } },
        { id: 't2', function: { name: 'Run', arguments: '{}' } }
      ]
    })
    expect(messages[3]).toMatchObject({ role: 'tool', toolCallId: 't1', content: 'Created a.txt (+1)' })
    expect(messages[4]).toMatchObject({
      role: 'activity',
      activityType: A2UI_ACTIVITY_TYPE,
      id: 'a2ui:s1',
      content: { surfaceId: 's1', messages: [{ createSurface: { surfaceId: 's1' } }, { updateComponents: { surfaceId: 's1' } }] }
    })
    const state = ofType(events, EventType.STATE_SNAPSHOT)[0]!.snapshot as AguiSessionState
    expect(state.session.currentModeId).toBe('plan')
    expect(state.tasks).toMatchObject([{ content: 'Do it' }])
    expect(state.toolCalls['t2']).toMatchObject({ kind: 'execute', status: 'in_progress' })
  })

  it('a connect of an idle empty session is an empty snapshot and success', async () => {
    const events = await collect(coordinator.run(input()))
    expect(ofType(events, EventType.MESSAGES_SNAPSHOT)[0]?.messages).toEqual([])
    expect(ofType(events, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
  })

  it('a connect while a turn is running follows it to its end', async () => {
    let release: () => void = () => {}
    script = () => new Promise((resolve) => (release = () => resolve('end_turn')))
    const running = collect(coordinator.run(input({ messages: [user('go')] })))
    await new Promise((r) => setTimeout(r, 0))

    const follower = collect(coordinator.run(input()))
    await new Promise((r) => setTimeout(r, 0))
    emit(chunk('late text'))
    release()
    const events = await follower
    await expectValidStream(events)
    expect(ofType(events, EventType.TEXT_MESSAGE_CONTENT)[0]?.delta).toBe('late text')
    expect(ofType(events, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
    await running // the replaced run just ended without a terminal event
  })

  it('follows a turn that main runs on its own (a team room member, a scheduled task) until the session is idle again', async () => {
    broadcaster.setStatus(f.sessionId, 'working')
    const follower = collect(coordinator.run(input()))
    await new Promise((r) => setTimeout(r, 0))
    emit(chunk('working in the background'))
    broadcaster.setStatus(f.sessionId, 'idle')
    const events = await follower
    await expectValidStream(events)
    expect(ofType(events, EventType.TEXT_MESSAGE_CONTENT)[0]?.delta).toBe('working in the background')
    expect(ofType(events, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
  })

  it('reports the permission request of a background turn: open before the connect, or opened while it follows', async () => {
    broadcaster.setStatus(f.sessionId, 'working')
    void askPermission()
    await new Promise((r) => setTimeout(r, 0))
    const before = await collect(coordinator.run(input()))
    expect(ofType(before, EventType.RUN_FINISHED)[0]?.outcome).toMatchObject({ type: 'interrupt', interrupts: [{ toolCallId: 't1' }] })

    broker.respond(broker.pendingRequests(f.sessionId)[0]!.id, 'allow')
    broadcaster.setStatus(f.sessionId, 'working')
    const following = collect(coordinator.run(input()))
    await new Promise((r) => setTimeout(r, 0))
    void askPermission()
    const events = await following
    expect(ofType(events, EventType.RUN_FINISHED)[0]?.outcome).toMatchObject({ type: 'interrupt' })
  })

  it('a reconnect that carries the transcript (its last message is a user message main prompted) is not a new prompt', async () => {
    let prompts = 0
    script = async () => (prompts++, 'end_turn')
    f.repos.transcripts.appendMessage(f.sessionId, 'user', [{ kind: 'text', text: 'New in the room: you were called.' }])
    const first = await collect(coordinator.run(input()))
    const messages = ofType(first, EventType.MESSAGES_SNAPSHOT)[0]!.messages
    expect(messages.at(-1)?.role).toBe('user')
    const again = await collect(coordinator.run(input({ messages })))
    expect(types(again)).not.toContain(EventType.RUN_ERROR)
    expect(ofType(again, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'success' })
    expect(prompts).toBe(0)
  })

  it('a prompt while a background turn runs is refused (the agent is busy), not started beside it', async () => {
    broadcaster.setStatus(f.sessionId, 'working')
    const events = await collect(coordinator.run(input({ messages: [user('hello?')] })))
    expect(ofType(events, EventType.RUN_ERROR)[0]?.message).toMatch(/still working/)
  })
})

describe('AguiRunCoordinator: A2UI and abort', () => {
  it('delivers an a2ui action as a turn and streams surface changes as activity snapshots', async () => {
    const { surfaces } = f.repos
    script = async () => 'end_turn'
    const action: A2uiClientEvent = {
      surfaceId: 's1',
      sourceComponentId: 'ok',
      action: { name: 'submit' },
      dataModel: {},
      timestamp: '2026-01-01T00:00:00Z'
    }
    // Handling the action draws a surface and removes it again, like an agent reacting to the click.
    dispatchScript = async () => {
      fan.publish('surface.changed', surfaces.create(f.sessionId, { surfaceId: 's1', catalogId: 'cat', title: null }))
      fan.publish('surface.removed', { sessionId: f.sessionId, surfaceId: 's1' })
    }
    const events = await collect(coordinator.run(input({ forwardedProps: { a2uiAction: action } })))
    await expectValidStream(events)
    expect(dispatched).toEqual([{ ...action, sessionId: f.sessionId }])
    const activities = ofType(events, EventType.ACTIVITY_SNAPSHOT)
    expect(activities).toMatchObject([
      { messageId: 'a2ui:s1', activityType: A2UI_ACTIVITY_TYPE, content: { surfaceId: 's1', messages: [{ createSurface: { surfaceId: 's1' } }] }, replace: true },
      { messageId: 'a2ui:s1', activityType: A2UI_ACTIVITY_TYPE, content: { surfaceId: 's1', deleted: true, messages: [] } }
    ])
  })

  it('ends an open text message before a surface appears', async () => {
    script = async () => {
      emit(chunk('Look: '))
      fan.publish('surface.changed', f.repos.surfaces.create(f.sessionId, { surfaceId: 's2', catalogId: 'cat', title: null }))
      emit(chunk('there'))
      return 'end_turn'
    }
    const events = await collect(coordinator.run(input({ messages: [user('x')] })))
    await expectValidStream(events)
    expect(types(events).filter((t) => t.startsWith('TEXT') || t === EventType.ACTIVITY_SNAPSHOT)).toEqual([
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.ACTIVITY_SNAPSHOT,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END
    ])
  })

  it('abort cancels the session turn only while one runs', async () => {
    await coordinator.abort(threadId(), 'r')
    expect(cancelled).toEqual([])
    let release: () => void = () => {}
    script = () => new Promise((resolve) => (release = () => resolve('cancelled')))
    onCancel = () => release()
    const running = collect(coordinator.run(input({ messages: [user('go')] })))
    await new Promise((r) => setTimeout(r, 0))
    await coordinator.abort(threadId(), 'r')
    expect(cancelled).toEqual([f.sessionId])
    expect(ofType(await running, EventType.RUN_FINISHED)[0]?.outcome).toEqual({ type: 'cancelled' })
  })
})

const desktopState = (desktopId: number, tools: DesktopState['tools']): DesktopState => ({
  desktopId,
  title: 'project',
  drives: [{ letter: 'C', label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null }],
  home: 'C:\\Users\\Agent',
  focusedWindowId: null,
  windows: [],
  tools,
  paused: false,
  userInControl: false,
  notes: [],
  surfaces: []
})

describe('AguiRunCoordinator: desktop', () => {
  it('passes the desktop context of the run to the prompt, or null when the client sent none', async () => {
    const seen: (string | null | undefined)[] = []
    script = async (prompt) => (seen.push(prompt.desktopContext), 'end_turn')
    const context = [{ description: DESKTOP_CONTEXT_DESCRIPTION, value: '{"desktopId":1}' }]
    await collect(coordinator.run(input({ messages: [user('one')], context })))
    await collect(coordinator.run(input({ messages: [user('two')], context: [{ description: 'other', value: 'x' }] })))
    expect(seen).toEqual(['{"desktopId":1}', null])
  })

  it('has the desktop in the state snapshot and keeps it current with STATE_DELTA, for the chats of that desktop only', async () => {
    const queries = new SessionQueryService(f.repos.sessions, f.repos.transcripts, f.repos.tasks, f.repos.changes, f.repos.terminals, f.repos.surfaces, {
      stateOfSession: (id) => (id === f.sessionId ? desktopState(1, ['shell']) : null)
    })
    const withDesktop = new AguiRunCoordinator({
      queries,
      sessions: { promptTurn: (input) => script(input), cancel: async () => {} },
      a2ui: { dispatch: async () => {} },
      broker,
      events: bus,
      appEvents: fan,
      newId: () => `id-${++counter}`
    })
    script = async () => {
      fan.publish('desktop.changed', desktopState(2, ['shell', 'browser'])) // another desktop
      fan.publish('desktop.changed', desktopState(1, ['shell', 'terminal']))
      return 'end_turn'
    }
    const events = await collect(withDesktop.run(input({ messages: [user('hi')] })))

    const snapshot = ofType(events, EventType.STATE_SNAPSHOT)[0]!.snapshot as { desktop: DesktopState }
    expect(snapshot.desktop).toMatchObject({ desktopId: 1, tools: ['shell'] })
    const ops = ofType(events, EventType.STATE_DELTA).flatMap((e) => e.delta as { op: string; path: string; value?: unknown }[])
    expect(ops.filter((o) => o.path.startsWith('/desktop'))).toEqual([{ op: 'add', path: '/desktop/tools/1', value: 'terminal' }])
  })
})
