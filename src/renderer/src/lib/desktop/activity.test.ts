import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { DEFAULT_TOOL_POLICY, type ToolPolicyDto } from '@shared/desktop'
import { feedText, noToolsOpen, recentToolCalls, toolChips, workingText, type ChatActivityInput } from './activity'

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
  it('shows equal calls in a row as one line with a count', () => {
    const feed = recentToolCalls([chat(1, { toolCalls: { a: call('Read the page'), b: call('Read the page'), c: call('Read the page'), d: call('Clicked'), e: call('Read the page') } })])
    expect(feed.map((f) => [f.title, f.count])).toEqual([['Read the page', 1], ['Clicked', 1], ['Read the page', 3]])
    expect(feedText('Read the page', 24)).toBe('Read the page (24 times)')
    expect(feedText('Clicked', 1)).toBe('Clicked')
  })
})

describe('toolChips', () => {
  const policy = (over: Partial<ToolPolicyDto['groups']>): ToolPolicyDto => ({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, ...over } })

  it('always shows the three headline chips and hides the shell group', () => {
    expect(toolChips([]).map((c) => c.label)).toEqual(['Read files (off)', 'Run commands (off)', 'Browser (off)'])
    expect(toolChips(['shell']).map((c) => c.group)).toEqual(['fs.read', 'terminal', 'browser'])
    expect(noToolsOpen(['shell'])).toBe(true)
    expect(noToolsOpen(['shell', 'code'])).toBe(false)
  })
  it('says (asks) for Ask and (off) for Deny or a closed app', () => {
    const chips = toolChips(['shell', 'fs.read', 'terminal', 'browser'], policy({ terminal: 'ask', browser: 'deny' }))
    expect(chips.map((c) => [c.label, c.state])).toEqual([['Read files', 'on'], ['Run commands (asks)', 'asks'], ['Browser (off)', 'off']])
  })
  it('adds the other open apps after the headline chips', () => {
    const chips = toolChips(['shell', 'fs.read', 'fs.write', 'code', 'notepad'], policy({}))
    expect(chips.map((c) => c.label)).toEqual(['Read files', 'Run commands (off)', 'Browser (off)', 'Write files (asks)', 'Code', 'Notepad'])
  })
  it('reads (asks) on everything that is on while Ask before every action is on', () => {
    const chips = toolChips(['fs.read', 'code'], policy({}), true)
    expect(chips.map((c) => c.label)).toEqual(['Read files (asks)', 'Run commands (off)', 'Browser (off)', 'Code (asks)'])
  })
})
