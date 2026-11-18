import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { DEFAULT_TOOL_POLICY, type ToolPolicyDto } from '@shared/desktop'
import { workingAgents, CONTROL_IDLE_NOTE, CONTROL_NOTE, NOT_SAVED_TEXT, barStatus, controlNote, TAKE_OVER_TIP, chipAriaLabel, controlText, feedAction, feedTarget, feedText, recentToolCalls, toolChips, waitingText, workingChatId, workingText, type ChatActivityInput, type FeedItem } from './activity'

const call = (title: string, status: AguiToolCallState['status'] = 'completed'): AguiToolCallState => ({ title, kind: 'read', status, rawInput: null, locations: [], contents: [] })
const chat = (id: number, over: Partial<ChatActivityInput> = {}): ChatActivityInput => ({ sessionId: id, title: `Chat ${id}`, status: 'idle', toolCalls: {}, ...over })

const OPEN_PREFIX = 'Open Control Center to change this.'
const policy = (over: Partial<ToolPolicyDto['groups']>): ToolPolicyDto => ({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, ...over } })

describe('workingText', () => {
  it('is null when every chat is idle', () => {
    expect(workingText([chat(1), chat(2, { status: 'closed' })])).toBeNull()
  })
  it('shows the running tool of a working chat', () => {
    expect(workingText([chat(1, { status: 'working', toolCalls: { a: call('Read a.ts'), b: call('Edit b.ts', 'in_progress') } })])).toBe('Edit b.ts')
  })
  it('words a running Browser step as a sentence, never as a tool id (UX-170)', () => {
    const typing = { ...call('agentxp.browser_type', 'in_progress'), rawInput: '{"ref":7,"text":"Standup"}' }
    expect(workingText([chat(1, { status: 'working', toolCalls: { a: typing } })])).toBe("Typing 'Standup'")
    expect(workingText([chat(1, { status: 'working', toolCalls: { a: call('agentxp.browser_read', 'in_progress') } })])).toBe('Reading the page')
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

describe('workingText follows the focused chat (UX-145)', () => {
  it('says Starting the agent only while the focused chat itself is connecting', () => {
    expect(workingText([chat(1, { status: 'connecting' })], undefined, 1)).toBe('Starting the agent...')
    expect(workingText([chat(1, { status: 'idle' }), chat(2, { status: 'connecting' })], undefined, 1)).toBeNull()
    expect(workingText([chat(1, { status: 'idle' }), chat(2, { status: 'connecting' })], undefined, 2)).toBe('Starting the agent...')
  })
  it('never says Starting the agent for a chat that is ready for input', () => {
    expect(workingText([chat(1, { status: 'idle' })], undefined, 1)).toBeNull()
    expect(workingText([chat(1, { status: 'idle' }), chat(2, { status: 'idle' })])).toBeNull()
  })
  it('reads the running tool of the focused chat, and is ready for a ready chat whatever another one does', () => {
    const working = chat(2, { status: 'working', toolCalls: { a: call('Read a.ts', 'in_progress') } })
    expect(workingText([chat(1), working], undefined, 2)).toBe('Read a.ts')
    expect(workingText([chat(1), working], undefined, 1)).toBeNull()
  })
  it('without a focused chat a chat that is only starting is not mentioned', () => {
    expect(workingText([chat(1, { status: 'connecting' })])).toBeNull()
    expect(workingText([chat(1, { status: 'connecting' })], undefined, null)).toBeNull()
  })
  it('requests that wait count whichever chat has the focus', () => {
    expect(workingText([chat(1), chat(2, { status: 'awaiting_permission' })], undefined, 1)).toBe('Waiting for you: 1 request to approve')
    expect(workingText([chat(1)], 2, 1)).toBe('Waiting for you: 2 requests to approve')
  })
})

describe('the waiting link and the take-over text', () => {
  it('names the chat in the link when the bar is given its words', () => {
    expect(barStatus({ paused: false, userInControl: false, working: null, waiting: 1, waitingFor: 'Fix login is waiting: run a command' })).toEqual({ state: 'waiting', text: 'Fix login is waiting: run a command' })
  })
  it('one sentence says what taking control does, in the bar, the Activity tile and the Take over tooltip', () => {
    expect(TAKE_OVER_TIP).toBe('You are in control. All tools ask first until you click Resume.')
    expect(CONTROL_IDLE_NOTE).toBe(`${TAKE_OVER_TIP} This is not saved.`)
    expect(CONTROL_NOTE).toBe('You are in control. The agent asks first. This is not saved.')
    expect(NOT_SAVED_TEXT).toBe('To keep a tool on Ask, change it in Control Center.')
  })
  it('a chip tells a screen reader that it opens Control Center', () => {
    expect(chipAriaLabel(toolChips(null, false)[2])).toBe('Run commands: Allow. Open Control Center to change.')
    expect(chipAriaLabel(toolChips(null, true)[2])).toBe('Run commands: Ask first (now). Asks you first. Open Control Center to change.')
  })
  it('a chip that is Ask only because the box is ticked says (now) and names the saved setting (UX-173)', () => {
    const [read, , run] = toolChips(policy({ terminal: 'allow' }), true)
    expect(run).toMatchObject({ label: 'Run commands: Ask first (now)', word: 'Ask' })
    expect(run.tooltip).toBe('Open Control Center to change this. Saved setting: Allow. You are in control, so the agent asks first.\nAsks you first.')
    expect(read.label).toBe('Read files: Ask first (now)')
    // A saved Ask is Ask, not "now"; a saved Deny stays Deny.
    expect(toolChips(policy({ terminal: 'ask' }), true)[2].label).toBe('Run commands: Ask first')
    expect(toolChips(policy({ terminal: 'deny' }), true)[2].label).toBe('Run commands: Deny')
  })
  it('a chip that reads Ask has the second tooltip line "Asks you first." (UX-178)', () => {
    const run = toolChips(policy({ terminal: 'ask' }))[2]
    expect(run.tooltip.split('\n')).toEqual(['Open Control Center to change this. Run commands is set to Ask.', 'Asks you first.'])
    expect(toolChips(policy({ terminal: 'allow' }))[2].tooltip).not.toContain('Asks you first.')
  })
})

describe('workingText while a chat starts (UX-125)', () => {
  it('without a focused chat a chat that is starting is not reported (the desktop has nothing to say yet)', () => {
    expect(workingText([chat(1, { status: 'connecting' })])).toBeNull()
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
  it('with two or more chats working it reads "N agents working"; a waiting request still comes first', () => {
    expect(barStatus({ ...base, working: 'Read a.ts', agents: 3 })).toEqual({ state: 'working', text: '3 agents working' })
    expect(barStatus({ ...base, working: 'Read a.ts', agents: 1 })).toEqual({ state: 'working', text: 'Working: Read a.ts' })
    expect(barStatus({ ...base, working: 'Read a.ts', agents: 2, waiting: 1 }).state).toBe('waiting')
  })
  it('Paused wins over You are in control, which wins over Working; a notice never hides them', () => {
    const busy = { ...base, working: 'Read a.ts', notice: 'x' }
    expect(barStatus({ ...busy, userInControl: true })).toEqual({ state: 'control', text: 'You are in control. All tools ask first until you click Resume. This is not saved.' })
    expect(barStatus({ ...busy, userInControl: true, paused: true })).toEqual({ state: 'paused', text: 'Paused: no agent will act until you resume.' })
  })
})

describe('workingChatId (the "Working: ..." link)', () => {
  it('opens the focused chat when it works, else the newest working chat, else none', () => {
    const chats = [chat(1, { status: 'working', updatedAt: '2026-01-01' }), chat(2, { status: 'working', updatedAt: '2026-02-01' }), chat(3, { updatedAt: '2026-03-01' })]
    expect(workingChatId(chats, 1)).toBe(1)
    expect(workingChatId(chats, 3)).toBe(2)
    expect(workingChatId(chats)).toBe(2)
    expect(workingChatId([chat(4, { status: 'awaiting_permission' })])).toBe(4)
    expect(workingChatId([chat(5)])).toBeNull()
  })
})

describe('feed lines: where a click goes', () => {
  const line = (title: string, rawInput: unknown, over: Partial<AguiToolCallState> = {}) =>
    recentToolCalls([chat(7, { cwd: 'E:\\', toolCalls: { t1: { ...call(title), kind: 'other', rawInput: JSON.stringify(rawInput), ...over } } })])[0]!
  it('carries the chat and the call, and goes to Code, the Terminal or the Browser', () => {
    const read = line('agentxp.code_read', { path: 'src/a.ts', startLine: 3, endLine: 5 })
    expect(read).toMatchObject({ key: '7:t1', sessionId: 7, toolCallId: 't1', cwd: 'E:\\' })
    expect(feedTarget(read)).toEqual({ kind: 'code', path: 'E:\\src\\a.ts', lines: [3, 5] })
    expect(feedAction(read)).toBe('Show in Code')
    expect(feedAction(line('agentxp.terminal_run', { command: 'ls' }))).toBe('Show in Terminal')
    expect(feedAction(line('agentxp.browser_read', {}))).toBe('Show in Browser')
  })
  it('opens the chat when the step has no place to show', () => {
    expect(feedTarget(line('agentxp.board_get', {}))).toBeNull()
    expect(feedAction(line('agentxp.board_get', {}))).toBe('Open the chat')
  })
})

describe('controlNote', () => {
  const item = (status: FeedItem['status']): FeedItem => ({ key: '1:a', sessionId: 1, toolCallId: 'a', call: call('t', status), cwd: null, chatTitle: 'c', title: 't', status, count: 1 })
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
  it('shows the policy, not the open apps: Read files, Write files, Run commands and Browser, whatever is open', () => {
    expect(toolChips(DEFAULT_TOOL_POLICY).map((c) => c.label)).toEqual(['Read files: Allow', 'Write files: Ask first', 'Run commands: Ask first', 'Browser: Allow'])
    expect(toolChips().map((c) => c.group)).toEqual(['fs.read', 'fs.write', 'terminal', 'browser'])
  })
  it('says the Control Center setting: Allow, Ask or Deny', () => {
    const chips = toolChips(policy({ terminal: 'ask', browser: 'deny', 'fs.write': 'allow' }))
    expect(chips.map((c) => [c.label, c.state, c.word])).toEqual([['Read files: Allow', 'on', 'Allow'], ['Write files: Allow', 'on', 'Allow'], ['Run commands: Ask first', 'asks', 'Ask'], ['Browser: Deny', 'off', 'Deny']])
  })
  it('the tooltip names the setting and never says an app has to be open', () => {
    const [read, , run, browser] = toolChips(policy({ terminal: 'ask', browser: 'deny' }))
    expect(read.tooltip).toBe('Open Control Center to change this. Read files is set to Allow.')
    expect(run.tooltip).toBe('Open Control Center to change this. Run commands is set to Ask.\nAsks you first.')
    expect(browser.tooltip).toBe('Open Control Center to change this. Browser is set to Deny. The agent cannot use it.')
    expect(toolChips(policy({})).every((c) => !/open|closed/i.test(c.tooltip.replace(OPEN_PREFIX, '')))).toBe(true)
  })
  it('never reads Off, and never says Off against an Ask or Deny setting', () => {
    for (const askFirst of [false, true]) for (const setting of ['allow', 'ask', 'deny'] as const) {
      const chips = toolChips(policy({ terminal: setting, browser: setting, 'fs.read': setting }), askFirst)
      expect(chips.every((c) => !/\bOff\b/.test(c.label) && !/\bOff\b/.test(c.tooltip))).toBe(true)
    }
  })
  it('adds every other tool that is set to Deny, so a blocked tool is never hidden; never the admin apps', () => {
    const chips = toolChips(policy({ paint: 'deny', notepad: 'deny', scheduler: 'deny' }))
    expect(chips.map((c) => c.label)).toEqual(['Read files: Allow', 'Write files: Ask first', 'Run commands: Ask first', 'Browser: Allow', 'Notepad: Deny', 'Agent Paint: Deny'])
  })
  it('reads Ask first (now) on everything allowed while Ask before every action is on, and the take-over line agrees', () => {
    const chips = toolChips(policy({}), true)
    expect(chips.map((c) => c.label)).toEqual(['Read files: Ask first (now)', 'Write files: Ask first', 'Run commands: Ask first', 'Browser: Ask first (now)'])
    expect(controlText()).toBe('You are in control. All tools ask first until you click Resume. This is not saved.')
  })
})

describe('workingAgents: the rows of the top-bar agents popup', () => {
  const identityOf = (id: number) => ({ name: id === 1 ? 'Builder' : 'Reviewer', color: id === 1 ? '#1f6feb' : '#b5179e' })
  it('lists each working chat, newest first, with its identity and its step in plain words', () => {
    const chats: ChatActivityInput[] = [
      { sessionId: 1, title: 'Fix login', status: 'working', updatedAt: '2026-11-17T10:00:00Z', toolCalls: { a: { title: 'agentxp.code_read', kind: 'other', status: 'in_progress', rawInput: '{"path":"E:\\\\auth.ts"}', locations: [], contents: [] } } },
      { sessionId: 2, title: 'Review', status: 'awaiting_permission', updatedAt: '2026-11-17T10:01:00Z', toolCalls: {} },
      { sessionId: 3, title: 'Idle', status: 'idle', updatedAt: '2026-11-17T10:02:00Z', toolCalls: {} },
      { sessionId: 4, title: 'Thinker', status: 'working', updatedAt: '2026-11-17T09:00:00Z', toolCalls: {} }
    ]
    expect(workingAgents(chats, identityOf).map((a) => [a.sessionId, a.identity.name, a.step])).toEqual([
      [2, 'Reviewer', 'waiting for you'],
      [1, 'Builder', 'reading auth.ts'],
      [4, 'Reviewer', 'thinking']
    ])
  })
})
