import { beforeEach, describe, expect, it } from 'vitest'
import { SessionBroadcaster } from './SessionBroadcaster'
import { SessionEventProjector } from './SessionEventProjector'
import { createAppFixture } from './test-helpers'

let f: ReturnType<typeof createAppFixture>
let projector: SessionEventProjector

beforeEach(() => {
  f = createAppFixture()
  const broadcaster = new SessionBroadcaster(f.repos.sessions, f.publisher)
  projector = new SessionEventProjector(f.repos.sessions, f.repos.transcripts, f.repos.tasks, f.publisher, broadcaster)
})

describe('SessionEventProjector', () => {
  it('streams message chunks into one transcript entry and publishes each update', () => {
    const sink = { emit: (_k: string, e: Parameters<typeof projector.apply>[1]) => projector.apply(f.sessionId, e) }
    sink.emit('k', { type: 'message_chunk', role: 'agent', block: { kind: 'text', text: 'Hel' } })
    sink.emit('k', { type: 'message_chunk', role: 'agent', block: { kind: 'text', text: 'lo' } })

    const entries = f.repos.transcripts.list(f.sessionId)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'message', role: 'agent', blocks: [{ kind: 'text', text: 'Hello' }] })
    expect(f.publisher.payloads('transcript.upserted')).toHaveLength(2)
  })

  it('creates and updates tool calls', () => {
    projector.apply(f.sessionId, {
      type: 'tool_call_created',
      toolCallId: 't1',
      title: 'Read file',
      toolKind: 'read',
      status: 'pending',
      rawInput: null,
      rawOutput: null,
      locations: [],
      contents: []
    })
    projector.apply(f.sessionId, { type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed' } })

    expect(f.repos.transcripts.findToolCall(f.sessionId, 't1')).toMatchObject({ title: 'Read file', status: 'completed' })
    const last = f.publisher.payloads('transcript.upserted').at(-1)
    expect(last?.entry).toMatchObject({ kind: 'tool_call', status: 'completed' })
  })

  it('replaces the plan and publishes the tasks', () => {
    projector.apply(f.sessionId, {
      type: 'plan_replaced',
      entries: [{ content: 'Do it', priority: 'high', status: 'in_progress' }]
    })
    expect(f.repos.tasks.list(f.sessionId)).toHaveLength(1)
    expect(f.publisher.payloads('tasks.changed')[0]).toMatchObject({ sessionId: f.sessionId, tasks: [{ content: 'Do it' }] })
  })

  it('updates mode, commands and usage on the session and publishes it', () => {
    projector.apply(f.sessionId, { type: 'mode_changed', modeId: 'plan' })
    projector.apply(f.sessionId, {
      type: 'commands_updated',
      commands: [{ name: 'init', description: 'Init', hint: null }]
    })
    projector.apply(f.sessionId, { type: 'usage_updated', contextUsed: 10, contextSize: 100 })

    const session = f.repos.sessions.get(f.sessionId)
    expect(session).toMatchObject({ currentModeId: 'plan', contextUsed: 10, contextSize: 100 })
    expect(session?.commands.map((c) => c.name)).toEqual(['init'])
    expect(f.publisher.payloads('session.changed')).toHaveLength(3)
  })

  it('renames from the agent title and ignores a cleared title', () => {
    projector.apply(f.sessionId, { type: 'session_info_updated', title: 'From agent' })
    projector.apply(f.sessionId, { type: 'session_info_updated', title: null })
    expect(f.repos.sessions.get(f.sessionId)?.title).toBe('From agent')
    expect(f.publisher.payloads('session.changed')).toHaveLength(1)
  })
})
