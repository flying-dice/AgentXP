import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'
import { buildTranscriptRows, userParts } from './transcriptRows'

const none = new Map()

describe('buildTranscriptRows', () => {
  it('turns a stop-notice activity into a stop row after the agent text', () => {
    const messages: Message[] = [
      { id: 'a', role: 'assistant', content: 'Cut o' },
      { id: 'stop:1', role: 'activity', activityType: 'stop-notice', content: { reason: 'max_tokens' } }
    ]
    expect(buildTranscriptRows(messages, none).map((r) => r.kind)).toEqual(['agent', 'stop'])
    expect(buildTranscriptRows(messages, none)[1]).toMatchObject({ reason: 'max_tokens' })
  })

  it('shows tool calls with different ids of different turns as separate rows with their own results', () => {
    const call = (id: string): Message => ({ id: `a-${id}`, role: 'assistant', toolCalls: [{ id, type: 'function', function: { name: 'x', arguments: '{}' } }] })
    const rows = buildTranscriptRows(
      [call('t1'), { id: 'r1', role: 'tool', toolCallId: 't1', content: 'one' }, call('t1@2'), { id: 'r2', role: 'tool', toolCallId: 't1@2', content: 'two' }],
      none
    )
    expect(rows.map((r) => (r.kind === 'tool' ? r.result : null))).toEqual(['one', 'two'])
  })

  it('orders text, reasoning and tool calls, attaching tool results', () => {
    const messages: Message[] = [
      { id: 'u1', role: 'user', content: 'fix it' },
      { id: 'r1', role: 'reasoning', content: 'hmm' },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Looking.',
        toolCalls: [{ id: 't1', type: 'function', function: { name: 'Read', arguments: '{"path":"a"}' } }]
      },
      { id: 'm1', role: 'tool', toolCallId: 't1', content: 'file text' },
      { id: 'a2', role: 'assistant', content: 'Done.' }
    ]
    const rows = buildTranscriptRows(messages, none)
    expect(rows.map((r) => r.kind)).toEqual(['user', 'reasoning', 'agent', 'tool', 'agent'])
    expect(rows[3]).toMatchObject({ toolCallId: 't1', name: 'Read', result: 'file text' })
  })

  it('skips empty assistant and reasoning text and unanswered tool results are null', () => {
    const rows = buildTranscriptRows(
      [
        { id: 'r', role: 'reasoning', content: '  ' },
        { id: 'a', role: 'assistant', content: '', toolCalls: [{ id: 't', type: 'function', function: { name: 'x', arguments: '{}' } }] }
      ],
      none
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'tool', result: null })
  })

  it('places a live surface at its activity message and drops deleted ones', () => {
    const messages: Message[] = [
      { id: 'a', role: 'assistant', content: 'Here:' },
      { id: 'a2ui:s1', role: 'activity', activityType: 'a2ui-surface', content: { surfaceId: 's1', messages: [] } },
      { id: 'a2ui:s2', role: 'activity', activityType: 'a2ui-surface', content: { surfaceId: 's2', messages: [] } }
    ]
    const surfaces = new Map([['s1', { messageId: 'a2ui:s1', surfaceId: 's1', messages: [] }]])
    const rows = buildTranscriptRows(messages, surfaces)
    expect(rows.map((r) => r.kind)).toEqual(['agent', 'surface'])
  })
})

describe('userParts', () => {
  it('joins text parts and names attached files', () => {
    const parts = userParts([
      { type: 'text', text: 'see' },
      { type: 'document', source: { type: 'url', value: 'file:///home/me/My%20Doc.pdf' } }
    ])
    expect(parts).toEqual({ text: 'see', attachments: ['My Doc.pdf'] })
  })
})
