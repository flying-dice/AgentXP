import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, type DesktopState } from '@shared/desktop'
import type { SessionDto } from '@shared/models'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteStickyNoteRepository } from '../../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { createVfsFixture } from '../test-helpers'
import { DesktopService, type ChatLifecycle } from './DesktopService'

class FakeChats implements ChatLifecycle {
  cancelled: number[] = []
  removed: number[] = []
  constructor(private readonly f: Awaited<ReturnType<typeof createVfsFixture>>) {}
  async create(desktopId: number, agentId: number | undefined, cwd: string | undefined): Promise<SessionDto> {
    return this.f.repos.sessions.create({ agentId: agentId ?? this.f.agentId, desktopId, cwd, title: 'New session' })
  }
  async cancel(id: number): Promise<void> {
    this.cancelled.push(id)
  }
  async remove(id: number): Promise<void> {
    this.removed.push(id)
    this.f.repos.sessions.remove(id)
  }
}

let f: Awaited<ReturnType<typeof createVfsFixture>>
let chats: FakeChats
let service: DesktopService
let desktopId: number

const changes = (): DesktopState[] => f.publisher.payloads('desktop.changed')

beforeEach(async () => {
  f = await createVfsFixture()
  chats = new FakeChats(f)
  service = new DesktopService({
    desktops: f.repos.desktops,
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    agents: f.repos.agents,
    sessions: f.repos.sessions,
    notes: new SqliteStickyNoteRepository(f.db),
    chats,
    drives: f.drives,
    events: f.publisher
  })
  desktopId = f.desktop.id
})

describe('DesktopService: desktops', () => {
  it('renames a desktop (state follows) and refuses an empty title', () => {
    service.rename(desktopId, '  Website  ')
    expect(service.state(desktopId).title).toBe('Website')
    expect(changes().at(-1)?.title).toBe('Website')
    expect(() => service.rename(desktopId, ' ')).toThrow(/needs a title/)
  })

  it('forgets its in-memory state when the desktop goes away', () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad', path: 'C:\\Users\\Agent\\a.txt' })
    service.updateView(notepad.id, { app: 'notepad', path: 'C:\\Users\\Agent\\a.txt', dirty: true, caretLine: 3 })
    service.forget(desktopId)
    expect(service.state(desktopId).windows[0]?.view).toMatchObject({ dirty: false, caretLine: 1 })
  })
})

describe('DesktopService: windows and state', () => {
  it('opens windows on top, focuses them and derives the tool groups', () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    const browser = service.openWindow({ desktopId, app: 'browser', url: 'https://example.com/' }, 'agent')
    const state = service.state(desktopId)
    expect(state.windows.map((w) => w.id)).toEqual([terminal.id, browser.id])
    expect(state.focusedWindowId).toBe(browser.id)
    expect(state.tools).toEqual(['shell', 'terminal', 'browser'])
    expect(state.drives.map((d) => `${d.letter}:${d.kind}`)).toEqual(['C:system', 'E:removable'])
    expect(state.home).toBe('C:\\Users\\Agent')
    expect(browser).toMatchObject({ openedBy: 'agent', view: { app: 'browser', url: 'https://example.com/' } })
    expect(changes().at(-1)?.tools).toEqual(['shell', 'terminal', 'browser'])
  })

  it('enforces singleton apps: opening Code twice focuses the window and shows the new file', () => {
    const first = service.openWindow({ desktopId, app: 'code', path: 'E:\\a.ts' })
    service.openWindow({ desktopId, app: 'notepad' })
    const again = service.openWindow({ desktopId, app: 'code', path: 'E:\\b.ts' })
    expect(again.id).toBe(first.id)
    expect(service.windowsOf(desktopId, 'code')).toHaveLength(1)
    expect(again.view).toMatchObject({ app: 'code', tabs: ['E:\\a.ts', 'E:\\b.ts'], activePath: 'E:\\b.ts' })
    expect(service.state(desktopId).focusedWindowId).toBe(first.id)
    service.openWindow({ desktopId, app: 'control-centre' })
    service.openWindow({ desktopId, app: 'control-centre' })
    expect(service.windowsOf(desktopId, 'control-centre')).toHaveLength(1)
  })

  it('lets non-singleton apps open many windows', () => {
    service.openWindow({ desktopId, app: 'notepad' })
    service.openWindow({ desktopId, app: 'notepad' })
    expect(service.windowsOf(desktopId, 'notepad')).toHaveLength(2)
  })

  it('closing the last window of an app removes its tools and moves focus', () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    service.closeWindow(notepad.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: terminal.id, tools: ['shell', 'terminal'] })
    service.closeWindow(terminal.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: null, windows: [], tools: ['shell'] })
  })

  it('minimised windows keep their tools; focusing restores them', () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    service.setWindowState(terminal.id, 'minimized')
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: null, tools: ['shell', 'terminal'] })
    service.focusWindow(terminal.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: terminal.id, windows: [{ windowState: 'normal' }] })
  })

  it('persists bounds, path and url, but views come back from the persisted subtype', () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    service.setBounds(notepad.id, { x: 9, y: 8, width: 700, height: 500 })
    service.updateView(notepad.id, { app: 'notepad', path: 'E:\\docs\\notes.md', dirty: true, caretLine: 12 })
    expect(service.state(desktopId).windows[0]).toMatchObject({
      title: 'notes.md - Notepad',
      bounds: { x: 9, y: 8, width: 700, height: 500 },
      view: { path: 'E:\\docs\\notes.md', dirty: true, caretLine: 12 }
    })
    // A second service over the same database (a restart): the transient flags are gone, the path stays.
    const restarted = new DesktopService({ ...(service as unknown as { deps: ConstructorParameters<typeof DesktopService>[0] }).deps })
    expect(restarted.state(desktopId).windows[0]?.view).toEqual({ app: 'notepad', path: 'E:\\docs\\notes.md', dirty: false, caretLine: 1 })
  })

  it('rejects a view of the wrong app and publishes nothing for an unchanged state', () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    expect(() => service.updateView(terminal.id, { app: 'agent-manager' })).toThrow(/terminal window/)
    const before = changes().length
    service.focusWindow(terminal.id)
    expect(changes()).toHaveLength(before)
  })

  it('shows the chat title and follows renames', async () => {
    const chat = await service.newChat(desktopId)
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    expect(chat).toMatchObject({ app: 'chat', title: 'New session' })
    expect(service.openWindow({ desktopId, app: 'chat', sessionId }).id).toBe(chat.id)
    f.repos.sessions.rename(sessionId, 'Fix the build')
    service.onSessionChanged(f.repos.sessions.get(sessionId)!)
    expect(changes().at(-1)?.windows[0]).toMatchObject({ title: 'Fix the build', view: { title: 'Fix the build' } })
    f.repos.sessions.remove(sessionId)
    service.onSessionRemoved()
    expect(changes().at(-1)?.windows).toEqual([])
  })

  it('refuses a chat of another desktop', async () => {
    const other = f.repos.desktops.create({ agentId: f.agentId, title: 'other', isOpen: false })
    const chat = await service.newChat(desktopId)
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    expect(() => service.openWindow({ desktopId: other.id, app: 'chat', sessionId })).toThrow(/another desktop/)
  })
})

describe('DesktopService: window placement and focus', () => {
  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

  const openChat = async () => service.newChat(desktopId)

  it('tiles a new window beside the focused chat instead of over it', async () => {
    const chat = await openChat()
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    expect(overlaps(notepad.bounds, chat.bounds)).toBe(false)
    expect(notepad.bounds.x).toBeGreaterThanOrEqual(chat.bounds.x + chat.bounds.width)
    // The second window is only checked against the chat once the notepad took focus: it must not cover the notepad's chat either.
    expect(terminal.bounds.x + terminal.bounds.width).toBeLessThanOrEqual(1280)
  })

  it('follows a chat that was moved', async () => {
    const chat = await openChat()
    service.setBounds(chat.id, { x: 600, y: 100, width: 640, height: 520 })
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(overlaps(notepad.bounds, { x: 600, y: 100, width: 640, height: 520 })).toBe(false)
  })

  it('cascades as before when the focused window is not a chat', () => {
    service.openWindow({ desktopId, app: 'terminal' })
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(notepad.bounds).toEqual({ x: 224, y: 144, width: 520, height: 380 })
  })

  it('a window the agent opens goes behind the focused chat, keeps the chat focused and is flagged until focused', async () => {
    const chat = await openChat()
    const code = service.openWindow({ desktopId, app: 'code' }, 'agent')
    let state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.map((w) => w.id)).toEqual([code.id, chat.id]) // back to front: chat on top
    expect(state.windows.find((w) => w.id === code.id)?.attention).toBe(true)
    expect(state.windows.find((w) => w.id === chat.id)?.attention).toBeUndefined()
    service.focusWindow(code.id)
    state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(code.id)
    expect(state.windows.find((w) => w.id === code.id)?.attention).toBeUndefined()
  })

  it('an agent that reopens or focuses an existing window does not steal focus either', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    const chat = await openChat()
    expect(service.state(desktopId).focusedWindowId).toBe(chat.id)
    service.openWindow({ desktopId, app: 'code', path: 'C:\\Users\\Agent\\a.ts' }, 'agent')
    service.focusWindow(code.id, 'agent')
    const state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.at(-1)?.id).toBe(chat.id)
    expect(state.windows.find((w) => w.id === code.id)).toMatchObject({ attention: true, view: { activePath: 'C:\\Users\\Agent\\a.ts' } })
  })

  it('an agent window takes focus when no chat is focused, and the user always does', async () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    const browser = service.openWindow({ desktopId, app: 'browser' }, 'agent')
    expect(service.state(desktopId).focusedWindowId).toBe(browser.id)
    await openChat()
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(service.state(desktopId).focusedWindowId).toBe(notepad.id)
    expect(terminal.openedBy).toBe('user')
  })
})

describe('DesktopService: control flags and policy', () => {
  it('pausing cancels the busy chats of that desktop only', async () => {
    const busy = await service.newChat(desktopId)
    const idle = await service.newChat(desktopId)
    const id = (w: typeof busy): number => (w.view.app === 'chat' ? w.view.sessionId : 0)
    f.repos.sessions.setStatus(id(busy), 'working')
    f.repos.sessions.setStatus(id(idle), 'idle')
    await service.setPaused(desktopId, true)
    expect(chats.cancelled).toEqual([id(busy)])
    expect(service.state(desktopId).paused).toBe(true)
    await service.setPaused(desktopId, false)
    expect(chats.cancelled).toHaveLength(1)
    service.setUserInControl(desktopId, true)
    expect(service.state(desktopId).userInControl).toBe(true)
  })

  it('serves the default policy and stores changes', () => {
    expect(service.policy()).toEqual(DEFAULT_TOOL_POLICY)
    service.setPolicy({ groups: { ...DEFAULT_TOOL_POLICY.groups, terminal: 'deny', browser: 'ask' }, openApps: 'ask' })
    expect(service.policy()).toEqual({ groups: { ...DEFAULT_TOOL_POLICY.groups, terminal: 'deny', browser: 'ask' }, openApps: 'ask' })
  })

  it('builds the prompt context from the chat desktop', async () => {
    const chat = await service.newChat(desktopId)
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    expect(JSON.parse(service.contextOfSession(sessionId)!)).toMatchObject({ desktopId, tools: ['shell'] })
    expect(service.contextOfSession(f.sessionId)).toBeNull() // the fixture chat has no desktop
  })

  it('starts chats in the given working directory (default: the agent home)', async () => {
    const home = await service.newChat(desktopId)
    const project = await service.newChat(desktopId, undefined, 'E:\\')
    const cwdOf = (w: typeof home): string => f.repos.sessions.get(w.view.app === 'chat' ? w.view.sessionId : 0)!.cwd
    expect(cwdOf(home)).toBe('C:\\Users\\Agent')
    expect(cwdOf(project)).toBe('E:\\')
  })

  it('shows plugging in and ejecting a drive in the desktop state at once', () => {
    const other = f.repos.folders.add(f.desktopsDir, 'other')
    const published = changes().length
    f.drives.observe((id) => service.refresh(id))
    f.drives.plugInFolder(desktopId, other.id)
    expect(changes().at(-1)?.drives.map((d) => d.letter)).toEqual(['C', 'E', 'F'])
    f.drives.eject(desktopId, 'E')
    expect(changes().at(-1)?.drives.map((d) => d.letter)).toEqual(['C', 'F'])
    expect(changes().length).toBeGreaterThan(published)
  })
})
