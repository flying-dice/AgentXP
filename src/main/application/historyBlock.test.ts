import { describe, expect, it } from 'vitest'
import type { SessionDto, TranscriptEntryDto } from '@shared/models'
import { HISTORY_MAX_CHARS, HISTORY_RESOURCE_URI, historyBlock } from './historyBlock'

const session = { id: 1, title: 'Fix the login form' } as SessionDto
const message = (id: number, role: 'user' | 'agent', text: string): TranscriptEntryDto =>
  ({ kind: 'message', id, sessionId: 1, seq: id, role, blocks: [{ kind: 'text', text }], createdAt: '' }) as unknown as TranscriptEntryDto

describe('historyBlock', () => {
  it('is null for a chat with no message', () => {
    expect(historyBlock(session, [])).toBeNull()
  })

  it('carries the conversation as Markdown in a resource the transcript never shows', () => {
    const block = historyBlock(session, [message(1, 'user', 'hi'), message(2, 'agent', 'hello')])
    expect(block).toMatchObject({ kind: 'resource', uri: HISTORY_RESOURCE_URI, mimeType: 'text/markdown' })
    const text = block?.kind === 'resource' ? (block.text ?? '') : ''
    expect(text).toMatch(/reopened/)
    expect(text).toContain('### You\n\nhi')
    expect(text).toContain('### Agent\n\nhello')
  })

  it('cuts a long conversation at the start and keeps the end', () => {
    const block = historyBlock(session, [message(1, 'user', 'x'.repeat(HISTORY_MAX_CHARS)), message(2, 'agent', 'the latest answer')])
    const text = block?.kind === 'resource' ? (block.text ?? '') : ''
    expect(text).toContain('[The start of the conversation is left out.]')
    expect(text.endsWith('the latest answer\n')).toBe(true)
    expect(text.length).toBeLessThan(HISTORY_MAX_CHARS + 500)
  })
})
