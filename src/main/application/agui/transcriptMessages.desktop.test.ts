import { describe, expect, it } from 'vitest'
import { DESKTOP_RESOURCE_URI } from '@shared/desktop'
import type { TranscriptEntryDto } from '@shared/models'
import { transcriptToMarkdown } from '../transcriptMarkdown'
import { TranscriptMessageBuilder } from './transcriptMessages'

type MessageEntry = Extract<TranscriptEntryDto, { kind: 'message' }>

const entry: MessageEntry = {
  kind: 'message',
  id: 1,
  seq: 1,
  role: 'user',
  blocks: [
    { kind: 'resource', uri: DESKTOP_RESOURCE_URI, mimeType: 'application/json', text: '{"desktopId":1}' },
    { kind: 'text', text: 'hello' }
  ],
  createdAt: '2026-11-16T00:00:00Z'
}

describe('the desktop state block of a prompt', () => {
  it('is not shown as part of the user message', () => {
    const { messages } = new TranscriptMessageBuilder({ terminals: {} }, new Map()).build([entry])
    expect(messages).toEqual([{ id: 'message:1', role: 'user', content: 'hello' }])
  })

  it('keeps other resources and attachments', () => {
    const withFile: MessageEntry = { ...entry, blocks: [...entry.blocks, { kind: 'resource_link', uri: 'file:///a', name: 'a', mimeType: null }] }
    const { messages } = new TranscriptMessageBuilder({ terminals: {} }, new Map()).build([withFile])
    expect(messages[0]).toMatchObject({ content: [{ type: 'text', text: 'hello' }, { type: 'document' }] })
  })

  it('is left out of the Markdown export', () => {
    const md = transcriptToMarkdown({ title: 'T' } as never, [entry])
    expect(md).toContain('hello')
    expect(md).not.toContain('desktopId')
  })
})
