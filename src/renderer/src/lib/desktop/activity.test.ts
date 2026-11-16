import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { DEFAULT_TOOL_POLICY, type ToolPolicyDto } from '@shared/desktop'
import { WAITING_FOR_YOU, barStatus, noToolsOpen, recentToolCalls, toolChips, workingText, type ChatActivityInput } from './activity'

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
    expect(workingText([chat(1, { status: 'awaiting_permission' })])).toBe('Waiting for you')
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

describe('barStatus', () => {
  const base = { paused: false, userInControl: false, working: null }
  it('is Idle, or the short notice that stands in for it', () => {
    expect(barStatus(base)).toEqual({ state: 'idle', text: 'Idle' })
    expect(barStatus({ ...base, notice: 'Resumed. Nothing was stopped.' })).toEqual({ state: 'idle', text: 'Resumed. Nothing was stopped.' })
  })
  it('says what is going on: Working, Waiting for you', () => {
    expect(barStatus({ ...base, working: 'Read a.ts' })).toEqual({ state: 'working', text: 'Working: Read a.ts' })
    expect(barStatus({ ...base, working: WAITING_FOR_YOU })).toEqual({ state: 'waiting', text: 'Waiting for you' })
  })
  it('Paused wins over You are in control, which wins over Working; a notice never hides them', () => {
    const busy = { ...base, working: 'Read a.ts', notice: 'x' }
    expect(barStatus({ ...busy, userInControl: true })).toEqual({ state: 'control', text: 'You are in control: the agent asks before every action.' })
    expect(barStatus({ ...busy, userInControl: true, paused: true })).toEqual({ state: 'paused', text: 'Paused: no agent will act until you resume.' })
  })
})

describe('toolChips', () => {
  const policy = (over: Partial<ToolPolicyDto['groups']>): ToolPolicyDto => ({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, ...over } })

  it('always shows the three headline chips, in one pattern, and hides the shell group', () => {
    expect(toolChips([]).map((c) => c.label)).toEqual(['Read files: Off', 'Run commands: Off', 'Browser: Off'])
    expect(toolChips(['shell']).map((c) => c.group)).toEqual(['fs.read', 'terminal', 'browser'])
    expect(noToolsOpen(['shell'])).toBe(true)
    expect(noToolsOpen(['shell', 'code'])).toBe(false)
  })
  it('says the Control Center setting: Allow, Ask or Deny', () => {
    const chips = toolChips(['shell', 'fs.read', 'terminal', 'browser'], policy({ terminal: 'ask', browser: 'deny' }))
    expect(chips.map((c) => [c.label, c.state])).toEqual([['Read files: Allow', 'on'], ['Run commands: Ask', 'asks'], ['Browser: Deny', 'off']])
  })
  it('reads Off only while no app that gives the tool is open, and the tooltip says which and what the setting is', () => {
    const [read, run, browser] = toolChips(['shell', 'fs.read'], policy({}))
    expect(read.tooltip).toBe('Read files: Allow. Click to change this in Control Center.')
    expect(run.label).toBe('Run commands: Off')
    expect(run.tooltip).toBe('Run commands is Off because no Terminal is open. The setting is Ask. Click to change it.')
    expect(browser.tooltip).toBe('Browser is Off because no Browser is open. The setting is Allow. Click to change it.')
    expect(toolChips([], policy({}))[0].tooltip).toBe('Read files is Off because no Explorer, Code or Code Review is open. The setting is Allow. Click to change it.')
  })
  it('a Deny setting reads Deny even when its app is closed', () => {
    expect(toolChips([], policy({ terminal: 'deny' }))[1]).toMatchObject({ label: 'Run commands: Deny', state: 'off' })
  })
  it('every chip has a tooltip', () => {
    expect(toolChips(['shell', 'code', 'notepad', 'fs.write'], policy({})).every((c) => c.tooltip.length > 0)).toBe(true)
  })
  it('adds the other open apps after the headline chips', () => {
    const chips = toolChips(['shell', 'fs.read', 'fs.write', 'code', 'notepad'], policy({}))
    expect(chips.map((c) => c.label)).toEqual(['Read files: Allow', 'Run commands: Off', 'Browser: Off', 'Write files: Ask', 'Code: Allow', 'Notepad: Allow'])
  })
  it('reads Ask on everything that is on while Ask before every action is on', () => {
    const chips = toolChips(['fs.read', 'code'], policy({}), true)
    expect(chips.map((c) => c.label)).toEqual(['Read files: Ask', 'Run commands: Off', 'Browser: Off', 'Code: Ask'])
  })
})
