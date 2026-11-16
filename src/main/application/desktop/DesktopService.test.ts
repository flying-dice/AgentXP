import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, type DesktopState } from '@shared/desktop'
import type { SessionDto } from '@shared/models'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteStickyNoteRepository } from '../../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { createAppFixture } from '../test-helpers'
import { DesktopService, type ChatLifecycle } from './DesktopService'
import type { DesktopWindowHost } from './ports'

class FakeChats implements ChatLifecycle {
  cancelled: number[] = []
  removed: number[] = []
  constructor(private readonly f: ReturnType<typeof createAppFixture>) {}
  async create(folderId: number, agentId: number | undefined, desktopId: number): Promise<SessionDto> {
    return this.f.repos.sessions.create({ folderId, agentId: agentId ?? this.f.agentId, desktopId, title: 'New session' })
  }
  async cancel(id: number): Promise<void> {
    this.cancelled.push(id)
  }
  async remove(id: number): Promise<void> {
    this.removed.push(id)
    this.f.repos.sessions.remove(id)
  }
}

let f: ReturnType<typeof createAppFixture>
let chats: FakeChats
let hostCalls: string[]
let picked: { id: number; path: string; name: string; lastOpenedAt: null } | null
let service: DesktopService
let desktopId: number

const changes = (): DesktopState[] => f.publisher.payloads('desktop.changed')

beforeEach(() => {
  f = createAppFixture()
  chats = new FakeChats(f)
  hostCalls = []
  picked = null
  const host: DesktopWindowHost = { open: (id) => hostCalls.push(`open:${id}`), close: (id) => hostCalls.push(`close:${id}`) }
  service = new DesktopService({
    desktops: new SqliteDesktopRepository(f.db),
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    folders: f.repos.folders,
    agents: f.repos.agents,
    sessions: f.repos.sessions,
    notes: new SqliteStickyNoteRepository(f.db),
    chats,
    pickFolder: async () => picked,
    host,
    events: f.publisher
  })
  desktopId = service.desktopForFolder(f.folderId).id
})

describe('DesktopService: desktops', () => {
  it('creates a closed desktop for a folder once, and opens desktops through the window host', async () => {
    expect(service.desktopForFolder(f.folderId).id).toBe(desktopId)
    expect(service.list()).toMatchObject([{ id: desktopId, folderId: f.folderId, title: 'project', isOpen: false }])
    service.open(desktopId)
    expect(hostCalls).toEqual([`open:${desktopId}`])
    expect(service.listOpen().map((d) => d.id)).toEqual([desktopId])
    service.windowClosed(desktopId)
    expect(service.listOpen()).toEqual([])
  })

  it('create picks a folder, makes an open desktop and asks for its window; cancelling creates nothing', async () => {
    expect(await service.create()).toBeNull()
    picked = { id: f.folderId, path: '/work/project', name: 'project', lastOpenedAt: null }
    const created = await service.create()
    expect(created).toMatchObject({ folderId: f.folderId, isOpen: true })
    expect(hostCalls).toEqual([`open:${created!.id}`])
    expect((await service.create(f.folderId))?.id).not.toBe(created!.id)
  })

  it('removes the chats and window, then the desktop', async () => {
    const chat = await service.newChat(desktopId)
    await service.remove(desktopId)
    expect(hostCalls).toContain(`close:${desktopId}`)
    expect(chats.removed).toEqual([chat.view.app === 'chat' ? chat.view.sessionId : -1])
    expect(service.list()).toEqual([])
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
    expect(state.folder).toMatchObject({ id: f.folderId, path: '/work/project' })
    expect(browser).toMatchObject({ openedBy: 'agent', view: { app: 'browser', url: 'https://example.com/' } })
    expect(changes().at(-1)?.tools).toEqual(['shell', 'terminal', 'browser'])
  })

  it('enforces singleton apps: opening Code twice focuses the window and shows the new file', () => {
    const first = service.openWindow({ desktopId, app: 'code', path: 'a.ts' })
    service.openWindow({ desktopId, app: 'notepad' })
    const again = service.openWindow({ desktopId, app: 'code', path: 'b.ts' })
    expect(again.id).toBe(first.id)
    expect(service.windowsOf(desktopId, 'code')).toHaveLength(1)
    expect(again.view).toMatchObject({ app: 'code', tabs: ['a.ts', 'b.ts'], activePath: 'b.ts' })
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
    service.updateView(notepad.id, { app: 'notepad', path: 'notes.md', dirty: true, caretLine: 12 })
    expect(service.state(desktopId).windows[0]).toMatchObject({
      title: 'notes.md - Notepad',
      bounds: { x: 9, y: 8, width: 700, height: 500 },
      view: { path: 'notes.md', dirty: true, caretLine: 12 }
    })
    // A second service over the same database (a restart): the transient flags are gone, the path stays.
    const restarted = new DesktopService({ ...(service as unknown as { deps: ConstructorParameters<typeof DesktopService>[0] }).deps })
    expect(restarted.state(desktopId).windows[0]?.view).toEqual({ app: 'notepad', path: 'notes.md', dirty: false, caretLine: 1 })
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
    const other = await service.create(f.folderId)
    const chat = await service.newChat(desktopId)
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    expect(() => service.openWindow({ desktopId: other!.id, app: 'chat', sessionId })).toThrow(/another desktop/)
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
})
