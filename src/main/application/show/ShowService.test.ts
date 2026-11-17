import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, type DesktopState, type PolicyDecision, type ToolPolicyDto } from '@shared/desktop'
import type { NoticeDto } from '@shared/notices'
import { showFileLabel, type ShowTarget } from '@shared/show'
import { AppError } from '../errors'
import { RecordingPublisher } from '../test-helpers'
import { ShowService } from './ShowService'
import type { CheckedTarget } from './ShowTargets'

const DESKTOP = 1
const FRONT = 10
const BACK = 20

let foreground: number | null
let paused: boolean
let userInControl: boolean
let decision: PolicyDecision
let answer: boolean
let asked: string[]
let landed: { label: string; focus: boolean }[]
let stale: Set<string>
let windows: DesktopState['windows']
let events: RecordingPublisher
let service: ShowService
let ids: number

const file = (path: string, lines?: [number, number]): ShowTarget => ({ kind: 'file', path, ...(lines ? { lines } : {}) })
const ctx = (sessionId = FRONT) => ({ desktopId: DESKTOP, sessionId })

beforeEach(() => {
  foreground = FRONT
  paused = false
  userInControl = false
  decision = 'allow'
  answer = true
  asked = []
  landed = []
  stale = new Set()
  windows = [{ id: 7, app: 'browser', windowState: 'normal' } as DesktopState['windows'][number]]
  events = new RecordingPublisher()
  ids = 0
  service = new ShowService({
    desktops: {
      state: () => ({ desktopId: DESKTOP, paused, userInControl, windows }) as DesktopState,
      foregroundSessionId: () => foreground,
      policy: (): ToolPolicyDto => ({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, show: decision } })
    },
    identity: (sessionId) => ({ name: sessionId === FRONT ? 'Builder' : 'Reviewer', color: '#123456' }),
    ask: async (_sessionId, title) => {
      asked.push(title)
      return answer
    },
    targets: {
      check: async (_context, target): Promise<CheckedTarget> => {
        const label = target.kind === 'file' ? showFileLabel(target.path, target.lines) : target.kind
        if (stale.has(label)) throw new AppError(`There is no file ${label}. Nothing was shown.`)
        return { target, label }
      },
      land: async (_context, checked, focus) => {
        landed.push({ label: checked.label, focus })
        return { kind: 'window', windowId: 3 }
      }
    },
    events,
    sleep: async () => {},
    now: () => new Date('2026-11-17T10:00:00Z'),
    newId: () => `s${++ids}`
  })
})

const lastNotice = (): NoticeDto => events.payloads('desktop.notice').at(-1)!

describe('ShowService: the foreground rule', () => {
  it('the foreground chat: the target lands now (no focus taken) and desktop.show carries the note and the identity', async () => {
    const result = await service.show(ctx(), file('E:\\auth.ts', [40, 62]), ' Here the token is checked ')
    expect(result).toMatchObject({ outcome: 'shown', label: 'auth.ts:40-62' })
    expect(result.text).toMatch(/^Shown now: auth\.ts:40-62\n/)
    expect(landed).toEqual([{ label: 'auth.ts:40-62', focus: false }])
    expect(events.payloads('desktop.show')).toEqual([
      {
        desktopId: DESKTOP,
        showId: 's1',
        sessionId: FRONT,
        identity: { name: 'Builder', color: '#123456' },
        target: file('E:\\auth.ts', [40, 62]),
        label: 'auth.ts:40-62',
        note: 'Here the token is checked',
        spot: { kind: 'window', windowId: 3 },
        cursor: true,
        at: '2026-11-17T10:00:00.000Z'
      }
    ])
  })

  it('any other chat: a request notice with Show and Not now, nothing lands until the operator accepts it', async () => {
    const result = await service.show(ctx(BACK), file('E:\\auth.ts', [40, 62]), 'The bug is here')
    expect(result.outcome).toBe('request')
    expect(landed).toEqual([])
    expect(events.payloads('desktop.show')).toEqual([])
    expect(lastNotice()).toMatchObject({ kind: 'show', title: 'Show request', text: 'Reviewer wants to show you auth.ts:40-62: The bug is here', identity: { name: 'Reviewer' }, sessionId: BACK })
    expect(lastNotice().actions).toEqual([
      { id: 'show-s1-show', label: 'Show', target: { kind: 'show', showId: 's1' } },
      { id: 'show-s1-later', label: 'Not now', target: { kind: 'later' } }
    ])
    expect(events.payloads('desktop.showQueue').at(-1)).toEqual({ desktopId: DESKTOP, waiting: 1 })
    await service.accept(DESKTOP, 's1')
    expect(landed).toEqual([{ label: 'auth.ts:40-62', focus: true }]) // the operator asked
    expect(events.payloads('desktop.show').at(-1)).toMatchObject({ showId: 's1', sessionId: BACK, cursor: true })
    expect(events.payloads('desktop.showQueue').at(-1)).toEqual({ desktopId: DESKTOP, waiting: 0 })
    await expect(service.accept(DESKTOP, 's1')).rejects.toThrow(/no longer waiting/)
  })

  it('no foreground chat at all (the operator is in Notepad): every show is a request', async () => {
    foreground = null
    expect((await service.show(ctx(), file('E:\\a.ts'), 'x')).outcome).toBe('request')
  })

  it('a request whose target went away is refused on Show, and nothing opens', async () => {
    await service.show(ctx(BACK), file('E:\\gone.ts'), 'x')
    stale.add('gone.ts')
    await expect(service.accept(DESKTOP, 's1')).rejects.toThrow(/There is no file gone\.ts/)
    expect(landed).toEqual([])
  })
})

describe('ShowService: one at a time', () => {
  it('a second show waits; dismissing the first lands the next; a queued target that went away is skipped', async () => {
    await service.show(ctx(), file('E:\\a.ts'), 'first')
    expect((await service.show(ctx(), file('E:\\b.ts'), 'second')).text).toMatch(/^Queued: b\.ts\nAnother show is on screen; yours comes next \(1 waiting\)/)
    await service.show(ctx(), file('E:\\c.ts'), 'third')
    await service.show(ctx(), file('E:\\d.ts'), 'fourth')
    expect(service.waiting(DESKTOP)).toBe(3)
    stale.add('b.ts')
    await service.dismiss(DESKTOP, 's1')
    expect(events.payloads('desktop.showEnded')).toEqual([{ desktopId: DESKTOP, showId: 's1', reason: 'dismissed' }])
    expect(landed.map((l) => l.label)).toEqual(['a.ts', 'c.ts'])
    expect(service.waiting(DESKTOP)).toBe(1)
    // A dismiss of a show that is not on screen (a late click) changes nothing.
    await service.dismiss(DESKTOP, 's1')
    expect(landed.map((l) => l.label)).toEqual(['a.ts', 'c.ts'])
    await service.dismiss(DESKTOP, 's3')
    expect(landed.map((l) => l.label)).toEqual(['a.ts', 'c.ts', 'd.ts'])
  })

  it('Show on a request replaces the show on screen', async () => {
    await service.show(ctx(), file('E:\\a.ts'), 'first')
    await service.show(ctx(BACK), file('E:\\b.ts'), 'other')
    await service.accept(DESKTOP, 's2')
    expect(events.payloads('desktop.showEnded')).toEqual([{ desktopId: DESKTOP, showId: 's1', reason: 'replaced' }])
    expect(landed.map((l) => l.label)).toEqual(['a.ts', 'b.ts'])
  })

  it('Show again lands with the focus and without the cursor', async () => {
    await service.again(ctx(), file('E:\\a.ts', [3, 3]), 'again')
    expect(landed).toEqual([{ label: 'a.ts:3', focus: true }])
    expect(events.payloads('desktop.show').at(-1)).toMatchObject({ label: 'a.ts:3', note: 'again', cursor: false })
  })
})

describe('ShowService: Pause, policy and Ask', () => {
  it('Pause drops the show on screen, the queue and the requests', async () => {
    await service.show(ctx(), file('E:\\a.ts'), 'first')
    await service.show(ctx(), file('E:\\b.ts'), 'queued')
    await service.show(ctx(BACK), file('E:\\c.ts'), 'request')
    expect(service.waiting(DESKTOP)).toBe(2)
    service.onEvent({ name: 'desktop.changed', payload: { desktopId: DESKTOP, paused: true } as DesktopState })
    expect(events.payloads('desktop.showEnded')).toEqual([{ desktopId: DESKTOP, showId: 's1', reason: 'paused' }])
    expect(service.waiting(DESKTOP)).toBe(0)
    expect(events.payloads('desktop.showQueue').at(-1)).toEqual({ desktopId: DESKTOP, waiting: 0 })
    await expect(service.accept(DESKTOP, 's3')).rejects.toThrow(/no longer waiting/)
    paused = true
    await expect(service.show(ctx(), file('E:\\a.ts'), 'x')).rejects.toThrow(/paused/)
  })

  it('Never: not shown, nothing lands, and the agent is told so (not an error)', async () => {
    decision = 'deny'
    const result = await service.show(ctx(), file('E:\\a.ts'), 'x')
    expect(result.outcome).toBe('never')
    expect(result.text).toMatch(/^Not shown \(Never\): a\.ts\n/)
    expect(landed).toEqual([])
    expect(events.payloads('desktop.notice')).toEqual([])
  })

  it('Ask, and Ask before every action: the chat asks first; a decline moves nothing', async () => {
    decision = 'ask'
    answer = false
    expect((await service.show(ctx(), file('E:\\a.ts'), 'x')).outcome).toBe('declined')
    expect(asked).toEqual(['Show you a.ts'])
    expect(landed).toEqual([])
    decision = 'allow'
    userInControl = true
    answer = true
    expect((await service.show(ctx(), file('E:\\a.ts'), 'x')).outcome).toBe('shown')
    expect(asked).toEqual(['Show you a.ts', 'Show you a.ts'])
  })

  it('a stale target is an error before anything is asked or opened', async () => {
    decision = 'ask'
    stale.add('gone.ts')
    await expect(service.show(ctx(), file('E:\\gone.ts'), 'x')).rejects.toThrow(/no file gone\.ts/)
    expect(asked).toEqual([])
    expect(landed).toEqual([])
  })
})

describe('ShowService: the Browser cursor', () => {
  const box = { x: 1, y: 2, width: 3, height: 4 }

  it('points at the box for the foreground chat while the Browser is on screen', async () => {
    expect(await service.pointAt(ctx(), 7, box)).toBe(true)
    expect(events.payloads('desktop.agentCursor')).toEqual([{ desktopId: DESKTOP, sessionId: FRONT, identity: { name: 'Builder', color: '#123456' }, spot: { kind: 'page-box', windowId: 7, box } }])
  })

  it('not for a background chat, a minimized Browser or while paused (the ring stays the only cue)', async () => {
    expect(await service.pointAt(ctx(BACK), 7, box)).toBe(false)
    windows = [{ id: 7, app: 'browser', windowState: 'minimized' } as DesktopState['windows'][number]]
    expect(await service.pointAt(ctx(), 7, box)).toBe(false)
    windows = [{ id: 7, app: 'browser', windowState: 'normal' } as DesktopState['windows'][number]]
    paused = true
    expect(await service.pointAt(ctx(), 7, box)).toBe(false)
    expect(events.payloads('desktop.agentCursor')).toEqual([])
  })

  it('also for the chat the operator follows (Follow), even in the background', async () => {
    const following = new ShowService({ ...(service as unknown as { deps: ConstructorParameters<typeof ShowService>[0] }).deps, followed: () => BACK })
    expect(await following.pointAt(ctx(BACK), 7, box)).toBe(true)
    expect(events.payloads('desktop.agentCursor')).toHaveLength(1)
  })

  it('onScreen tells Follow that a note is up', async () => {
    expect(service.onScreen(DESKTOP)).toBe(false)
    await service.show(ctx(), file('E:\\auth.ts', [1, 2]), 'why')
    expect(service.onScreen(DESKTOP)).toBe(true)
  })
})
