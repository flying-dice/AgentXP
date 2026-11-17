import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, type AppWindowState, type DesktopState, type PolicyDecision } from '@shared/desktop'
import type { TranscriptEntryDto } from '@shared/models'
import { AppError } from '../errors'
import type { AppEventMessage } from '../FanOutEventPublisher'
import { RecordingPublisher } from '../test-helpers'
import { FollowService } from './FollowService'

const DESKTOP = 1
const BUILDER = 10
const REVIEWER = 20
const CHAT_WINDOW = 5
const CODE_WINDOW = 6

let paused: boolean
let typing: boolean
let showOnScreen: boolean
let openApps: PolicyDecision
let windows: AppWindowState[]
let landed: { path: string; lines: [number, number] | null; focus: boolean }[]
let presented: { app: string; focus: boolean }[]
let views: { windowId: number; terminalId: unknown }[]
let refreshed: number
let timers: (() => void)[]
let events: RecordingPublisher
let service: FollowService

const win = (id: number, app: AppWindowState['app'], view: Record<string, unknown> = {}): AppWindowState => ({ id, app, windowState: 'normal', view: { app, ...view } }) as unknown as AppWindowState
const state = (): DesktopState => ({ desktopId: DESKTOP, paused, windows }) as DesktopState

const call = (toolCallId: string, title: string, rawInput: unknown, extra: Partial<Extract<TranscriptEntryDto, { kind: 'tool_call' }>> = {}): Extract<TranscriptEntryDto, { kind: 'tool_call' }> => ({
  kind: 'tool_call',
  id: 1,
  seq: 1,
  toolCallId,
  title,
  toolKind: 'other',
  status: 'in_progress',
  rawInput: JSON.stringify(rawInput),
  rawOutput: null,
  locations: [],
  contents: [],
  permission: null,
  createdAt: '2026-11-17T10:00:00Z',
  ...extra
})

const upsert = (sessionId: number, entry: TranscriptEntryDto): void => service.onEvent({ name: 'transcript.upserted', payload: { sessionId, entry } } as AppEventMessage)
const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const cursors = () => events.payloads('desktop.agentCursor')

beforeEach(() => {
  paused = false
  typing = false
  showOnScreen = false
  openApps = 'allow'
  windows = [win(CHAT_WINDOW, 'chat', { sessionId: BUILDER })]
  landed = []
  presented = []
  views = []
  refreshed = 0
  timers = []
  events = new RecordingPublisher()
  service = new FollowService({
    desktops: {
      state,
      policy: () => ({ ...DEFAULT_TOOL_POLICY, openApps }),
      operatorActive: () => typing,
      presentWindow: async (_sessionId, input, focus) => {
        presented.push({ app: input.app, focus })
        const open = windows.find((w) => w.app === input.app)
        if (open) return open
        const created = win(40 + windows.length, input.app, input.app === 'terminal' ? { terminalId: null } : {})
        windows = [...windows, created]
        return created
      },
      updateView: (windowId, view) => views.push({ windowId, terminalId: (view as { terminalId?: unknown }).terminalId }),
      refresh: () => void refreshed++
    },
    sessions: { get: (id) => (id === BUILDER || id === REVIEWER ? { desktopId: DESKTOP, cwd: 'E:\\' } : null) },
    identity: (id) => ({ name: id === BUILDER ? 'Builder' : 'Reviewer', color: id === BUILDER ? '#1f6feb' : '#b5179e' }),
    targets: {
      land: async (_context, checked, focus) => {
        const t = checked.target as { path: string; lines?: [number, number] }
        landed.push({ path: t.path, lines: t.lines ?? null, focus })
        return { kind: 'lines', windowId: CODE_WINDOW, path: t.path, lines: t.lines ?? null }
      }
    },
    shows: { onScreen: () => showOnScreen },
    events,
    setTimer: (run) => {
      timers.push(run)
      return timers.length
    },
    clearTimer: () => {}
  })
})

describe('FollowService: one followed chat per desktop', () => {
  it('follow puts the chat in the desktop state (with its identity); following another replaces it without an end line', () => {
    service.follow(DESKTOP, BUILDER)
    expect(service.state(DESKTOP)).toEqual({ sessionId: BUILDER, keep: false, identity: { name: 'Builder', color: '#1f6feb' } })
    service.follow(DESKTOP, REVIEWER, true)
    expect(service.state(DESKTOP)).toMatchObject({ sessionId: REVIEWER, keep: true })
    expect(events.payloads('desktop.followEnded')).toEqual([{ desktopId: DESKTOP, sessionId: BUILDER, identity: { name: 'Builder', color: '#1f6feb' }, reason: 'replaced' }])
    expect(refreshed).toBeGreaterThanOrEqual(2)
  })

  it('refuses a chat of another desktop and following while paused', () => {
    expect(() => service.follow(DESKTOP, 99)).toThrow(AppError)
    paused = true
    expect(() => service.follow(DESKTOP, BUILDER)).toThrow(/paused/)
  })
})

describe('FollowService: projection of Work', () => {
  beforeEach(() => service.follow(DESKTOP, BUILDER))

  it('a code_read lands Code at the lines without the focus, and the cursor goes there in the agent colour', async () => {
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\auth.ts', startLine: 3, endLine: 5 }))
    await flushPromises()
    expect(landed).toEqual([{ path: 'E:\\auth.ts', lines: [3, 5], focus: false }])
    expect(cursors()).toEqual([{ desktopId: DESKTOP, sessionId: BUILDER, identity: { name: 'Builder', color: '#1f6feb' }, spot: { kind: 'lines', windowId: CODE_WINDOW, path: 'E:\\auth.ts', lines: [3, 5] } }])
  })

  it('an update of the same step does not move the view again', async () => {
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\auth.ts', startLine: 3, endLine: 5 }))
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\auth.ts', startLine: 3, endLine: 5 }, { status: 'completed' }))
    await flushPromises()
    expect(landed).toHaveLength(1)
  })

  it('a code_edit goes to the file, then to the lines its result names', async () => {
    upsert(BUILDER, call('e1', 'agentxp.code_edit', { path: 'E:\\auth.ts', oldText: 'a', newText: 'b' }))
    upsert(BUILDER, call('e1', 'agentxp.code_edit', { path: 'E:\\auth.ts', oldText: 'a', newText: 'b' }, { status: 'completed', contents: [{ kind: 'content', block: { kind: 'text', text: 'Edited E:\\auth.ts (lines 7-8).' } }] }))
    await flushPromises()
    expect(landed.map((l) => l.lines)).toEqual([null, [7, 8]])
  })

  it("the agent's own read and edit (ACP kind and location) are projected too", async () => {
    upsert(BUILDER, call('a1', 'Read auth.ts', {}, { toolKind: 'read', locations: [{ path: 'E:\\auth.ts', line: 12 }] }))
    await flushPromises()
    expect(landed).toEqual([{ path: 'E:\\auth.ts', lines: [12, 12], focus: false }])
  })

  it('a search goes to its first match once the result is there', async () => {
    upsert(BUILDER, call('s1', 'agentxp.code_search', { query: 'token' }))
    await flushPromises()
    expect(landed).toEqual([])
    upsert(BUILDER, call('s1', 'agentxp.code_search', { query: 'token' }, { status: 'completed', contents: [{ kind: 'content', block: { kind: 'text', text: '1 match\nE:\\auth.ts:4:3: const token' } }] }))
    await flushPromises()
    expect(landed).toEqual([{ path: 'E:\\auth.ts', lines: [4, 4], focus: false }])
  })

  it('a run brings the Terminal forward without the focus (opened when Agent may open apps allows), on the ACP terminal', async () => {
    upsert(BUILDER, call('t1', 'Run npm test', { command: 'npm test' }, { toolKind: 'execute', contents: [{ kind: 'terminal', terminalId: 'term-1' }] }))
    await flushPromises()
    expect(presented).toEqual([{ app: 'terminal', focus: false }])
    expect(views).toEqual([{ windowId: expect.any(Number), terminalId: 'term-1' }])
    expect(cursors()[0]?.spot).toMatchObject({ kind: 'window' })
  })

  it('opens nothing that Agent may open apps would ask about: the step stays in the chat', async () => {
    openApps = 'ask'
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\auth.ts' }))
    upsert(BUILDER, call('t1', 'agentxp.terminal_run', { command: 'npm test' }))
    await flushPromises()
    expect(landed).toEqual([])
    expect(presented).toEqual([])
    windows = [...windows, win(CODE_WINDOW, 'code')]
    upsert(BUILDER, call('r2', 'agentxp.code_read', { path: 'E:\\b.ts' }))
    await flushPromises()
    expect(landed).toHaveLength(1)
  })

  it('only the followed chat is projected; failed steps and steps with no place are not', async () => {
    upsert(REVIEWER, call('r1', 'agentxp.code_read', { path: 'E:\\auth.ts' }))
    upsert(BUILDER, call('r2', 'agentxp.code_read', { path: 'E:\\auth.ts' }, { status: 'failed' }))
    upsert(BUILDER, call('l1', 'agentxp.fs_list', { path: 'E:\\' }))
    await flushPromises()
    expect(landed).toEqual([])
    expect(cursors()).toEqual([])
  })

  it('waits while the operator types and lands the newest step after the grace period', async () => {
    typing = true
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\a.ts' }))
    upsert(BUILDER, call('r2', 'agentxp.code_read', { path: 'E:\\b.ts' }))
    await flushPromises()
    expect(landed).toEqual([])
    expect(timers).toHaveLength(1)
    timers.shift()!() // still typing: tries again later
    await flushPromises()
    expect(landed).toEqual([])
    typing = false
    timers.shift()!()
    await flushPromises()
    expect(landed).toEqual([{ path: 'E:\\b.ts', lines: null, focus: false }])
  })

  it('waits while a show is on screen (its note stays where it is)', async () => {
    showOnScreen = true
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\a.ts' }))
    await flushPromises()
    expect(landed).toEqual([])
    showOnScreen = false
    timers.shift()!()
    await flushPromises()
    expect(landed).toHaveLength(1)
  })
})

describe('FollowService: how a follow ends', () => {
  beforeEach(() => service.follow(DESKTOP, BUILDER))
  const ended = () => events.payloads('desktop.followEnded').map((e) => e.reason)

  it('Stop following', () => {
    service.stop(DESKTOP)
    expect(service.state(DESKTOP)).toBeNull()
    expect(ended()).toEqual(['stopped'])
  })

  it('Pause ends it and nothing is projected after', async () => {
    paused = true
    service.onEvent({ name: 'desktop.changed', payload: state() } as AppEventMessage)
    expect(ended()).toEqual(['paused'])
    upsert(BUILDER, call('r1', 'agentxp.code_read', { path: 'E:\\a.ts' }))
    await flushPromises()
    expect(landed).toEqual([])
  })

  it('the end of the turn ends it, unless Keep following is on', () => {
    service.setKeep(DESKTOP, true)
    service.turnEnded(BUILDER)
    expect(service.state(DESKTOP)).toMatchObject({ keep: true })
    service.setKeep(DESKTOP, false)
    service.turnEnded(REVIEWER)
    expect(service.state(DESKTOP)).not.toBeNull()
    service.turnEnded(BUILDER)
    expect(ended()).toEqual(['turn-ended'])
  })

  it("closing the chat's window ends it, and so does deleting the chat", () => {
    windows = []
    service.onEvent({ name: 'desktop.changed', payload: state() } as AppEventMessage)
    expect(ended()).toEqual(['closed'])
    windows = [win(CHAT_WINDOW, 'chat', { sessionId: BUILDER })]
    service.follow(DESKTOP, BUILDER)
    service.onEvent({ name: 'session.removed', payload: { id: BUILDER } } as AppEventMessage)
    expect(ended()).toEqual(['closed', 'closed'])
  })

  it("a team member's follow ends when its room window closes", () => {
    const rooms = new FollowService({ ...(service as unknown as { deps: ConstructorParameters<typeof FollowService>[0] }).deps, roomOf: () => 3 })
    windows = [win(8, 'team-chat', { roomId: 3 })]
    rooms.follow(DESKTOP, REVIEWER)
    windows = []
    rooms.onEvent({ name: 'desktop.changed', payload: state() } as AppEventMessage)
    expect(rooms.state(DESKTOP)).toBeNull()
  })
})
