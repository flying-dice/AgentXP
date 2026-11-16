import type { SessionUpdate } from '@agentclientprotocol/sdk'
import { describe, expect, it } from 'vitest'
import { mapSessionUpdate } from './mapSessionUpdate'

const text = (t: string) => ({ type: 'text' as const, text: t })

describe('mapSessionUpdate', () => {
  it.each([
    ['user_message_chunk', 'user'],
    ['agent_message_chunk', 'agent'],
    ['agent_thought_chunk', 'thought']
  ] as const)('maps %s to a %s message chunk', (kind, role) => {
    const update = { sessionUpdate: kind, content: text('hi') } as SessionUpdate
    expect(mapSessionUpdate(update)).toEqual({ type: 'message_chunk', role, block: { kind: 'text', text: 'hi' } })
  })

  it('maps image, resource link, embedded resource and audio content', () => {
    const block = (content: object) => mapSessionUpdate({ sessionUpdate: 'agent_message_chunk', content } as SessionUpdate)
    expect(block({ type: 'image', data: 'AA', mimeType: 'image/png' })).toMatchObject({
      block: { kind: 'image', mimeType: 'image/png', data: 'AA', uri: null }
    })
    expect(block({ type: 'resource_link', uri: 'file:///a', name: 'a' })).toMatchObject({
      block: { kind: 'resource_link', uri: 'file:///a', name: 'a', mimeType: null }
    })
    expect(block({ type: 'resource', resource: { uri: 'file:///b', text: 'body' } })).toMatchObject({
      block: { kind: 'resource', uri: 'file:///b', text: 'body' }
    })
    expect(block({ type: 'resource', resource: { uri: 'file:///c', blob: 'AA' } })).toMatchObject({
      block: { kind: 'resource', text: null }
    })
    expect(block({ type: 'audio', data: 'AA', mimeType: 'audio/wav' })).toMatchObject({ block: { kind: 'text' } })
  })

  it('maps a created tool call with defaults and stringified raw values', () => {
    const event = mapSessionUpdate({
      sessionUpdate: 'tool_call',
      toolCallId: 't1',
      title: 'Read file',
      kind: 'read',
      status: 'in_progress',
      rawInput: { path: 'a.ts' },
      rawOutput: 'done',
      locations: [{ path: 'a.ts', line: 3 }, { path: 'b.ts' }],
      content: [
        { type: 'content', content: text('x') },
        { type: 'diff', path: 'a.ts', oldText: null, newText: 'n' },
        { type: 'terminal', terminalId: 'term-1' }
      ]
    })
    expect(event).toEqual({
      type: 'tool_call_created',
      toolCallId: 't1',
      title: 'Read file',
      toolKind: 'read',
      status: 'in_progress',
      rawInput: '{"path":"a.ts"}',
      rawOutput: 'done',
      locations: [{ path: 'a.ts', line: 3 }, { path: 'b.ts', line: null }],
      contents: [
        { kind: 'content', block: { kind: 'text', text: 'x' } },
        { kind: 'diff', path: 'a.ts', oldText: null, newText: 'n' },
        { kind: 'terminal', terminalId: 'term-1' }
      ]
    })
  })

  it('defaults kind to other and status to pending on creation', () => {
    expect(mapSessionUpdate({ sessionUpdate: 'tool_call', toolCallId: 't', title: 'x' })).toMatchObject({
      toolKind: 'other',
      status: 'pending',
      rawInput: null,
      contents: []
    })
  })

  it('maps a tool call update to a sparse patch', () => {
    expect(
      mapSessionUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed', title: null })
    ).toEqual({ type: 'tool_call_updated', toolCallId: 't1', patch: { status: 'completed' } })
    expect(
      mapSessionUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 't1', kind: 'bogus' as never, rawOutput: { a: 1 } })
    ).toEqual({ type: 'tool_call_updated', toolCallId: 't1', patch: { toolKind: 'other', rawOutput: '{"a":1}' } })
  })

  it('maps plan, mode, commands, usage and session info', () => {
    expect(
      mapSessionUpdate({ sessionUpdate: 'plan', entries: [{ content: 'a', priority: 'low', status: 'pending' }] })
    ).toEqual({ type: 'plan_replaced', entries: [{ content: 'a', priority: 'low', status: 'pending' }] })
    expect(mapSessionUpdate({ sessionUpdate: 'current_mode_update', currentModeId: 'plan' })).toEqual({
      type: 'mode_changed',
      modeId: 'plan'
    })
    expect(
      mapSessionUpdate({
        sessionUpdate: 'available_commands_update',
        availableCommands: [{ name: 'init', description: 'Init', input: { hint: 'path' } }, { name: 'x', description: 'X' }]
      })
    ).toEqual({
      type: 'commands_updated',
      commands: [
        { name: 'init', description: 'Init', hint: 'path' },
        { name: 'x', description: 'X', hint: null }
      ]
    })
    expect(mapSessionUpdate({ sessionUpdate: 'usage_update', used: 10, size: 100 })).toEqual({
      type: 'usage_updated',
      contextUsed: 10,
      contextSize: 100
    })
    expect(mapSessionUpdate({ sessionUpdate: 'session_info_update', title: 'T' })).toEqual({
      type: 'session_info_updated',
      title: 'T'
    })
    expect(mapSessionUpdate({ sessionUpdate: 'session_info_update', title: null })).toEqual({
      type: 'session_info_updated',
      title: null
    })
  })

  it('ignores updates it does not model', () => {
    expect(mapSessionUpdate({ sessionUpdate: 'session_info_update' })).toBeNull()
    expect(mapSessionUpdate({ sessionUpdate: 'config_option_update', configOptions: [] })).toBeNull()
    expect(mapSessionUpdate({ sessionUpdate: 'something_new' } as unknown as SessionUpdate)).toBeNull()
  })
})
