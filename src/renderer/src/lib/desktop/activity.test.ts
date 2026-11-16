import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { recentToolCalls, toolChips, workingText, type ChatActivityInput } from './activity'

const call = (title: string, status: AguiToolCallState['status'] = 'completed'): AguiToolCallState => ({ title, kind: 'read', status, rawInput: null, locations: [], contents: [] })
const chat = (id: number, over: Partial<ChatActivityInput> = {}): ChatActivityInput => ({ sessionId: id, title: `Chat ${id}`, status: 'idle', toolCalls: {}, ...over })

describe('workingText', () => {
  it('is null when every chat is idle', () => {
    expect(workingText([chat(1), chat(2, { status: 'closed' })])).toBeNull()
  })
  it('shows the running tool of a working chat', () => {
    expect(workingText([chat(1, { status: 'working', toolCalls: { a: call('Read a.ts'), b: call('Edit b.ts', 'in_progress') } })])).toBe('Edit b.ts')
  })
  it('falls back to the chat title, or the approval wait', () => {
    expect(workingText([chat(1, { status: 'working' })])).toBe('Chat 1')
    expect(workingText([chat(1, { status: 'awaiting_permission' })])).toBe('Waiting for approval')
  })
})

describe('recentToolCalls', () => {
  it('lists the latest calls of the newest chat first and honours the limit', () => {
    const feed = recentToolCalls(
      [
        chat(1, { updatedAt: '2026-01-01', toolCalls: { a: call('old1'), b: call('old2') } }),
        chat(2, { updatedAt: '2026-02-01', toolCalls: { a: call('new1'), b: call('new2') } })
      ],
      3
    )
    expect(feed.map((f) => f.title)).toEqual(['new2', 'new1', 'old2'])
  })
})

describe('toolChips', () => {
  it('hides the shell group', () => {
    expect(toolChips(['shell', 'fs.read', 'terminal']).map((c) => c.label)).toEqual(['Read files', 'Terminal'])
  })
})
