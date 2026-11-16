import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { DEFAULT_TOOL_POLICY, type ToolPolicyDto } from '@shared/desktop'
import { CONTROL_IDLE_NOTE, CONTROL_NOTE, barStatus, closedAppNames, controlNote, controlText, feedText, noToolsOpen, recentToolCalls, toolChips, toolsLine, waitingText, workingText, type ChatActivityInput, type FeedItem } from './activity'

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
    expect(workingText([chat(1, { status: 'awaiting_permission' })])).toBe('Waiting for you: 1 request to approve')
  })
  it('puts the waiting requests before a running tool, with the count', () => {
    const running = chat(1, { status: 'working', toolCalls: { b: call('Change src/auth/redirect.ts', 'in_progress') } })
    expect(workingText([running, chat(2, { status: 'awaiting_permission' })])).toBe('Waiting for you: 1 request to approve')
    expect(workingText([running, chat(2, { status: 'awaiting_permission' }), chat(3, { status: 'awaiting_permission' })])).toBe('Waiting for you: 2 requests to approve')
    expect(workingText([running], 2)).toBe('Waiting for you: 2 requests to approve')
    expect(workingText([running])).toBe('Change src/auth/redirect.ts')
  })
})

describe('workingText while a chat starts (UX-125)', () => {
  it('reads Starting the agent only while no chat is ready for input', () => {
    expect(workingText([chat(1, { status: 'connecting' })])).toBe('Starting the agent...')
  })
  it('is idle when one chat is connected and ready while another is still connecting', () => {
    expect(workingText([chat(1, { status: 'idle' }), chat(2, { status: 'connecting' })])).toBeNull()
  })
  it('still shows a working chat next to a ready one', () => {
    expect(workingText([chat(1, { status: 'idle' }), chat(2, { status: 'working' })])).toBe('Chat 2')
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

describe('barStatus', () => {
  const base = { paused: false, userInControl: false, working: null }
  it('is Idle, or the short notice that stands in for it', () => {
    expect(barStatus(base)).toEqual({ state: 'idle', text: 'Idle' })
    expect(barStatus({ ...base, notice: 'Resumed. Nothing was stopped.' })).toEqual({ state: 'idle', text: 'Resumed. Nothing was stopped.' })
  })
  it('says what is going on: Working, Waiting for you', () => {
    expect(barStatus({ ...base, working: 'Read a.ts' })).toEqual({ state: 'working', text: 'Working: Read a.ts' })
    expect(barStatus({ ...base, working: 'Read a.ts', waiting: 2 })).toEqual({ state: 'waiting', text: 'Waiting for you: 2 requests to approve' })
    expect(waitingText(1)).toBe('Waiting for you: 1 request to approve')
  })
  it('Paused wins over You are in control, which wins over Working; a notice never hides them', () => {
    const busy = { ...base, working: 'Read a.ts', notice: 'x' }
    expect(barStatus({ ...busy, userInControl: true })).toEqual({ state: 'control', text: 'You are in control. Every tool asks first until you resume.' })
    expect(barStatus({ ...busy, userInControl: true, closedApps: ['Terminal', 'Browser'] }).text).toBe('You are in control. Tools that need an app ask first. Terminal and Browser are not open.')
    expect(barStatus({ ...busy, userInControl: true, paused: true })).toEqual({ state: 'paused', text: 'Paused: no agent will act until you resume.' })
  })
})

describe('the agent line next to the chips', () => {
  it('counts a chat as something the agent can use', () => {
    expect(noToolsOpen(['shell'], 1)).toBe(false)
    expect(toolsLine(['shell'], 0)).toBe('Agent can use nothing yet. Open an app to give it a tool.')
    expect(toolsLine(['shell'], 1)).toBe('The agent can use this chat.')
    expect(toolsLine(['shell', 'code'], 1)).toBeNull()
  })
})

describe('controlNote', () => {
  const item = (status: FeedItem['status']): FeedItem => ({ key: 'a', chatTitle: 'c', title: 't', status, count: 1 })
  it('is absent while the user is not in control', () => {
    expect(controlNote(false, [item('in_progress')])).toBeNull()
  })
  it('says Stopped only when a step was running or was stopped', () => {
    expect(controlNote(true, [item('in_progress')])).toBe(CONTROL_NOTE)
    expect(controlNote(true, [item('cancelled')])).toBe(CONTROL_NOTE)
  })
  it('says Stopped when a chat was busy at the moment control was taken, even before a tool call shows', () => {
    expect(controlNote(true, [], true)).toBe(CONTROL_NOTE)
  })
  it('with nothing running it says the user is in control, never Stopped over "Nothing has happened yet"', () => {
    expect(controlNote(true, [])).toBe(CONTROL_IDLE_NOTE)
    expect(controlNote(true, [item('completed')])).toBe(CONTROL_IDLE_NOTE)
  })
})

describe('toolChips', () => {
  const policy = (over: Partial<ToolPolicyDto['groups']>): ToolPolicyDto => ({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, ...over } })

  it('always shows the three headline chips, in one pattern, and hides the shell group', () => {
    expect(toolChips([]).map((c) => c.label)).toEqual(['Read files: Allow (no app open)', 'Run commands: Allow (no Terminal open)', 'Browser: Allow (no Browser open)'])
    expect(toolChips(['shell']).map((c) => c.group)).toEqual(['fs.read', 'terminal', 'browser'])
    expect(noToolsOpen(['shell'])).toBe(true)
    expect(noToolsOpen(['shell', 'code'])).toBe(false)
  })
  it('says the Control Center setting: Allow, Ask or Deny', () => {
    const chips = toolChips(['shell', 'fs.read', 'terminal', 'browser'], policy({ terminal: 'ask', browser: 'deny' }))
    expect(chips.map((c) => [c.label, c.state])).toEqual([['Read files: Allow', 'on'], ['Run commands: Ask', 'asks'], ['Browser: Deny', 'off']])
  })
  it('keeps the setting word while no app that gives the tool is open, and the tooltip names the setting and the reason', () => {
    const [read, run, browser] = toolChips(['shell', 'fs.read'], policy({ terminal: 'ask' }))
    expect(read.tooltip).toBe('Read files is set to Allow. Click to change it in Control Center.')
    expect(run).toMatchObject({ label: 'Run commands: Ask (no Terminal open)', word: 'Ask', closed: true, state: 'off' })
    expect(run.tooltip).toBe('Run commands is set to Ask. The agent cannot use it yet because no Terminal is open. Click to change it in Control Center.')
    expect(browser.tooltip).toBe('Browser is set to Allow. The agent cannot use it yet because no Browser is open. Click to change it in Control Center.')
    expect(toolChips([], policy({}))[0].tooltip).toBe('Read files is set to Allow. The agent cannot use it yet because no Explorer, Code or Code Review is open. Click to change it in Control Center.')
  })
  it('never reads Off, and never says Off against an Ask or Deny setting', () => {
    for (const askFirst of [false, true]) for (const setting of ['allow', 'ask', 'deny'] as const) {
      const chips = toolChips([], policy({ terminal: setting, browser: setting, 'fs.read': setting }), askFirst)
      expect(chips.every((c) => !/\bOff\b/.test(c.label) && !/\bOff\b/.test(c.tooltip))).toBe(true)
    }
  })
  it('names the closed apps for the take-over text, so the bar and the chips agree', () => {
    const chips = toolChips(['shell', 'fs.read'], policy({}), true)
    expect(chips.map((c) => c.label)).toEqual(['Read files: Ask', 'Run commands: Ask (no Terminal open)', 'Browser: Ask (no Browser open)'])
    expect(closedAppNames(chips)).toEqual(['Terminal', 'Browser'])
    expect(controlText(closedAppNames(chips))).toBe('You are in control. Tools that need an app ask first. Terminal and Browser are not open.')
    expect(controlText(['Terminal'])).toBe('You are in control. Tools that need an app ask first. Terminal is not open.')
    expect(closedAppNames(toolChips([], policy({ terminal: 'deny' })))).toEqual(['Browser'])
  })
  it('a Deny setting reads Deny even when its app is closed', () => {
    expect(toolChips([], policy({ terminal: 'deny' }))[1]).toMatchObject({ label: 'Run commands: Deny', state: 'off' })
  })
  it('every chip has a tooltip', () => {
    expect(toolChips(['shell', 'code', 'notepad', 'fs.write'], policy({})).every((c) => c.tooltip.length > 0)).toBe(true)
  })
  it('adds the other open apps after the headline chips', () => {
    const chips = toolChips(['shell', 'fs.read', 'fs.write', 'code', 'notepad'], policy({}))
    expect(chips.map((c) => c.label)).toEqual(['Read files: Allow', 'Run commands: Ask (no Terminal open)', 'Browser: Allow (no Browser open)', 'Write files: Ask', 'Code: Allow', 'Notepad: Allow'])
  })
  it('reads Ask on everything that is on while Ask before every action is on', () => {
    const chips = toolChips(['fs.read', 'code'], policy({}), true)
    expect(chips.map((c) => c.label)).toEqual(['Read files: Ask', 'Run commands: Ask (no Terminal open)', 'Browser: Ask (no Browser open)', 'Code: Ask'])
  })
})
