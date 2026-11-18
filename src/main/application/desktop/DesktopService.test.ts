import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, enabledToolGroups, type AppView, type DesktopState } from '@shared/desktop'
import type { SessionDto, SessionRole } from '@shared/models'
import { WINDOW_MIN_Y } from '@shared/desktop-views'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteStickyNoteRepository } from '../../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { createVfsFixture } from '../test-helpers'
import { DesktopService, OPEN_APPS_BLOCKED, TYPING_GRACE_MS, type ChatLifecycle, type DesktopServiceDeps } from './DesktopService'

class FakeChats implements ChatLifecycle {
  cancelled: number[] = []
  removed: number[] = []
  constructor(private readonly f: Awaited<ReturnType<typeof createVfsFixture>>) {}
  created = 0
  async create(desktopId: number, agentId: number | undefined, cwd: string | undefined, role?: SessionRole): Promise<SessionDto> {
    this.created++
    return this.f.repos.sessions.create({ agentId: agentId ?? this.f.agentId, desktopId, cwd, title: 'New chat', role })
  }
  async cancel(id: number): Promise<void> {
    this.cancelled.push(id)
  }
  async remove(id: number): Promise<void> {
    this.removed.push(id)
    this.f.repos.sessions.remove(id)
  }
  /** Like `SessionService.keepAsChat`: an aside with a message of the user becomes a chat. */
  keepAsChat(id: number): boolean {
    const session = this.f.repos.sessions.get(id)
    if (!session) return false
    if (session.role === 'chat') return true
    if (session.role !== 'aside' || !this.f.repos.transcripts.list(id).some((e) => e.kind === 'message' && e.role === 'user')) return false
    this.f.repos.sessions.setRole(id, 'chat')
    return true
  }
}

/** The user writes in a pane chat (what makes it worth keeping). */
const say = (id: number, text = 'hello'): void => void f.repos.transcripts.appendMessage(id, 'user', [{ kind: 'text', text }])

let f: Awaited<ReturnType<typeof createVfsFixture>>
let chats: FakeChats
let service: DesktopService
let desktopId: number

const deps = (now?: () => number): DesktopServiceDeps => ({
  desktops: f.repos.desktops,
  windows: new SqliteAppWindowRepository(f.db),
  policies: new SqliteToolPolicyRepository(f.db),
  agents: f.repos.agents,
  sessions: f.repos.sessions,
  notes: new SqliteStickyNoteRepository(f.db),
  surfaces: f.repos.surfaces,
  chats,
  drives: f.drives,
  events: f.publisher,
  now
})

const changes = (): DesktopState[] => f.publisher.payloads('desktop.changed')

beforeEach(async () => {
  f = await createVfsFixture()
  chats = new FakeChats(f)
  service = new DesktopService(deps())
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
    expect(state.tools).toEqual(enabledToolGroups(['browser']))
    expect(state.drives.map((d) => `${d.letter}:${d.kind}`)).toEqual(['C:system', 'E:removable'])
    expect(state.home).toBe('C:\\Users\\Agent')
    expect(browser).toMatchObject({ openedBy: 'agent', view: { app: 'browser', url: 'https://example.com/' } })
    expect(changes().at(-1)?.tools).toEqual(enabledToolGroups(['browser']))
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

  it('closing the last window of an output app removes its tools (the others stay) and moves focus', () => {
    const browser = service.openWindow({ desktopId, app: 'browser' })
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    service.closeWindow(notepad.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: browser.id, tools: enabledToolGroups(['browser']) })
    service.closeWindow(browser.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: null, windows: [], tools: enabledToolGroups([]) })
    expect(service.state(desktopId).tools).toEqual(expect.arrayContaining(['fs.read', 'fs.write', 'terminal'])) // Work tools need no window
  })

  it('minimised windows keep their tools; focusing restores them', () => {
    const browser = service.openWindow({ desktopId, app: 'browser' })
    service.setWindowState(browser.id, 'minimized')
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: null, tools: enabledToolGroups(['browser']) })
    service.focusWindow(browser.id)
    expect(service.state(desktopId)).toMatchObject({ focusedWindowId: browser.id, windows: [{ windowState: 'normal' }] })
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

  it('keeps the file of Paint, WordPad and Agent Diagrams windows over a restart', () => {
    const paint = service.openWindow({ desktopId, app: 'paint' })
    const wordpad = service.openWindow({ desktopId, app: 'wordpad' })
    const diagrams = service.openWindow({ desktopId, app: 'diagrams' })
    service.updateView(paint.id, { app: 'paint', path: 'C:\\Users\\Agent\\Documents\\sketch.png', width: 800, height: 600, tool: 'pencil', color: '#000000', dirty: false })
    service.updateView(wordpad.id, { app: 'wordpad', path: 'C:\\Users\\Agent\\Documents\\plan.md', mode: 'read', dirty: false, visibleHeading: null })
    service.updateView(diagrams.id, { ...(service.state(desktopId).windows.find((w) => w.id === diagrams.id)!.view as Extract<AppView, { app: 'diagrams' }>), path: 'E:\\flow.xpdiagram' })
    const restarted = new DesktopService({ ...(service as unknown as { deps: ConstructorParameters<typeof DesktopService>[0] }).deps })
    const pathOf = (id: number) => (restarted.state(desktopId).windows.find((w) => w.id === id)?.view as { path: string | null }).path
    expect(pathOf(paint.id)).toBe('C:\\Users\\Agent\\Documents\\sketch.png')
    expect(pathOf(wordpad.id)).toBe('C:\\Users\\Agent\\Documents\\plan.md')
    expect(pathOf(diagrams.id)).toBe('E:\\flow.xpdiagram')
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
    expect(chat).toMatchObject({ app: 'chat', title: 'New chat' })
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

  it('a chat started from the Browser opens in the half the Browser does not use (UX-120)', async () => {
    const browser = service.openWindow({ desktopId, app: 'browser' })
    const chat = await openChat()
    const narrowed = service.state(desktopId).windows.find((w) => w.id === browser.id)!
    const shared = Math.max(0, Math.min(narrowed.bounds.x + narrowed.bounds.width, chat.bounds.x + chat.bounds.width) - Math.max(narrowed.bounds.x, chat.bounds.x))
    expect(shared / narrowed.bounds.width).toBeLessThanOrEqual(0.1)
    expect(chat.bounds.x + chat.bounds.width).toBeLessThanOrEqual(1280)
  })

  it('follows a chat that was moved', async () => {
    const chat = await openChat()
    service.setBounds(chat.id, { x: 600, y: 100, width: 640, height: 520 })
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(overlaps(notepad.bounds, { x: 600, y: 100, width: 640, height: 520 })).toBe(false)
  })

  it('cascades from the focused window (28 px right and down) when it is not a chat, and never starts under the top bar', () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    expect(terminal.bounds.y).toBeGreaterThanOrEqual(WINDOW_MIN_Y)
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(notepad.bounds).toMatchObject({ x: terminal.bounds.x + 28, y: terminal.bounds.y + 28, width: 520, height: 380 })
  })

  it('Help opens beside the window that asked for it', () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    const help = service.openWindow({ desktopId, app: 'help' })
    expect(overlaps(help.bounds, notepad.bounds)).toBe(false)
    expect(help.bounds.y).toBeGreaterThanOrEqual(WINDOW_MIN_Y)
  })

  it('an agent window opens right behind the focused window: no focus change, glow and taskbar flash', async () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    const chat = await openChat()
    const code = await service.openOutputWindow(1, { desktopId, app: 'code' })
    const state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.map((w) => w.id)).toEqual([notepad.id, code.id, chat.id]) // back to front: behind the chat, over the rest
    expect(state.windows.find((w) => w.id === code.id)).toMatchObject({ openedBy: 'agent', attention: true })
    service.focusWindow(code.id)
    expect(service.state(desktopId).windows.find((w) => w.id === code.id)?.attention).toBeUndefined()
  })

  it('keeps the focus with the user also when the focus was only implied (the front-most window)', async () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    service.closeWindow(service.openWindow({ desktopId, app: 'notepad' }).id) // no stored focus left: the front-most window has it
    await service.openOutputWindow(1, { desktopId, app: 'browser' })
    expect(service.state(desktopId).focusedWindowId).toBe(terminal.id)
  })

  it('never takes the focus, while the user types or long after', async () => {
    let now = 10_000
    service = new DesktopService(deps(() => now))
    const chat = await openChat()
    service.noteUserActivity(desktopId)
    await service.openOutputWindow(1, { desktopId, app: 'code' })
    now += TYPING_GRACE_MS + 1
    await service.openOutputWindow(1, { desktopId, app: 'browser' })
    expect(service.state(desktopId).focusedWindowId).toBe(chat.id)
  })

  it('on an empty desktop the agent window is simply the front window', async () => {
    const code = await service.openOutputWindow(1, { desktopId, app: 'code' })
    expect(service.state(desktopId).focusedWindowId).toBe(code.id)
  })

  it('reuses an existing singleton where it is: not raised, not focused, flashing, showing the new file', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    const chat = await openChat()
    const order = service.state(desktopId).windows.map((w) => w.id)
    await service.openOutputWindow(1, { desktopId, app: 'code', path: 'C:\\Users\\Agent\\a.ts' })
    const state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.map((w) => w.id)).toEqual(order)
    expect(state.windows.find((w) => w.id === code.id)).toMatchObject({ attention: true, view: { activePath: 'C:\\Users\\Agent\\a.ts' } })
  })

  it('presentWindow (a show of the foreground chat): the target comes to the front, restored, while the focus stays in the chat', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    service.setWindowState(code.id, 'minimized')
    const chat = await openChat()
    await service.presentWindow(1, { desktopId, app: 'code', path: 'C:\\Users\\Agent\\a.ts' }, false)
    let state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.at(-1)).toMatchObject({ id: code.id, windowState: 'normal', view: { activePath: 'C:\\Users\\Agent\\a.ts' } })
    // A new window opens in front, beside the chat, still without the focus.
    const terminal = await service.presentWindow(1, { desktopId, app: 'terminal' }, false)
    state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.at(-1)?.id).toBe(terminal.id)
    // The operator asked (Show on a request): it comes forward with the focus.
    await service.presentWindow(1, { desktopId, app: 'code', windowId: code.id }, true)
    expect(service.state(desktopId).focusedWindowId).toBe(code.id)
  })

  it('presentWindow follows "Agent may open apps" for a new window only', async () => {
    service.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    await expect(service.presentWindow(1, { desktopId, app: 'terminal' }, false)).rejects.toThrow(OPEN_APPS_BLOCKED)
    const code = service.openWindow({ desktopId, app: 'code' })
    await expect(service.presentWindow(1, { desktopId, app: 'code' }, false)).resolves.toMatchObject({ id: code.id })
  })

  it('never narrows the Browser for a chat the agent opens (only for the user\'s)', async () => {
    const browser = service.openWindow({ desktopId, app: 'browser' })
    const before = service.state(desktopId).windows.find((w) => w.id === browser.id)!.bounds
    const chat = await chats.create(desktopId, undefined, undefined, 'chat')
    await service.openOutputWindow(1, { desktopId, app: 'chat', sessionId: chat.id })
    expect(service.state(desktopId).windows.find((w) => w.id === browser.id)!.bounds).toEqual(before)
    expect(service.state(desktopId).focusedWindowId).toBe(browser.id)
  })

  it('follows "Agent may open apps": Never refuses, Ask asks in the chat, a reused window does not ask', async () => {
    const asked: [number, string][] = []
    let answer = false
    service.attachOpenApproval(async (sessionId, title) => {
      asked.push([sessionId, title])
      return answer
    })
    service.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    await expect(service.openOutputWindow(7, { desktopId, app: 'code' })).rejects.toThrow('Opening apps is blocked by the permission policy in Control Center.')
    service.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'ask' })
    await expect(service.openOutputWindow(7, { desktopId, app: 'code' })).rejects.toThrow('The user declined to open the Code app.')
    expect(service.state(desktopId).windows).toEqual([])
    answer = true
    await service.openOutputWindow(7, { desktopId, app: 'code' })
    await service.openOutputWindow(7, { desktopId, app: 'code' }) // reused: no question
    expect(asked).toEqual([[7, 'Open the Code app'], [7, 'Open the Code app']])
    expect(service.windowsOf(desktopId, 'code')).toHaveLength(1)
  })

  it('opens a surface window for the agent behind the user\'s window and a review window the same way', async () => {
    const chat = await openChat()
    const review = await service.openReview(desktopId, 'E:\\', 'HEAD', undefined, undefined, 'agent')
    const state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.find((w) => w.id === review.id)).toMatchObject({ openedBy: 'agent', attention: true })
    expect(await service.openAgentSurfaceWindow(99_999, 's1')).toBeNull() // a chat without a desktop
  })

  it('raiseWindow restores a minimized window, raises it and focuses it', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    await openChat()
    service.setWindowState(code.id, 'minimized')
    service.raiseWindow(code.id)
    const state = service.state(desktopId)
    expect(state.focusedWindowId).toBe(code.id)
    expect(state.windows.at(-1)).toMatchObject({ id: code.id, windowState: 'normal' })
  })

  it('a user window always takes the focus', async () => {
    await openChat()
    service.noteUserActivity(desktopId)
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    expect(service.state(desktopId).focusedWindowId).toBe(notepad.id)
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
    await service.setUserInControl(desktopId, true)
    expect(service.state(desktopId).userInControl).toBe(true)
  })

  it('saves the chats Pause stopped, and Resume returns them once (the saved list, not window memory)', async () => {
    const busy = await service.newChat(desktopId)
    const idle = await service.newChat(desktopId)
    const id = (w: typeof busy): number => (w.view.app === 'chat' ? w.view.sessionId : 0)
    f.repos.sessions.setStatus(id(busy), 'awaiting_permission')
    f.repos.sessions.setStatus(id(idle), 'idle')
    await service.setPaused(desktopId, true)
    expect(service.state(desktopId).stoppedByPause).toEqual([id(busy)])
    // A second Pause (another window, the API) keeps the list: the first one saw the working chats.
    f.repos.sessions.setStatus(id(busy), 'idle')
    await service.setPaused(desktopId, true)
    expect(service.state(desktopId).stoppedByPause).toEqual([id(busy)])
    expect(await service.resumeAgents(desktopId)).toEqual([id(busy)])
    expect(service.state(desktopId)).toMatchObject({ paused: false, stoppedByPause: [] })
    expect(await service.resumeAgents(desktopId)).toEqual([])
  })

  it('lifting the pause through setPaused(false) forgets the stopped chats', async () => {
    const busy = await service.newChat(desktopId)
    f.repos.sessions.setStatus(busy.view.app === 'chat' ? busy.view.sessionId : 0, 'working')
    await service.setPaused(desktopId, true)
    await service.setPaused(desktopId, false)
    expect(service.state(desktopId).stoppedByPause).toEqual([])
  })

  it('taking control cancels the running steps once and handing control back does not', async () => {
    const busy = await service.newChat(desktopId)
    const sessionId = busy.view.app === 'chat' ? busy.view.sessionId : 0
    f.repos.sessions.setStatus(sessionId, 'working')
    await service.setUserInControl(desktopId, true)
    expect(chats.cancelled).toEqual([sessionId])
    await service.setUserInControl(desktopId, true)
    await service.setUserInControl(desktopId, false)
    expect(chats.cancelled).toEqual([sessionId])
    expect(service.state(desktopId).userInControl).toBe(false)
  })

  it('serves the default policy and stores changes', () => {
    expect(service.policy()).toEqual(DEFAULT_TOOL_POLICY)
    service.setPolicy({ groups: { ...DEFAULT_TOOL_POLICY.groups, terminal: 'deny', browser: 'ask' }, openApps: 'ask' })
    expect(service.policy()).toEqual({ groups: { ...DEFAULT_TOOL_POLICY.groups, terminal: 'deny', browser: 'ask' }, openApps: 'ask' })
  })

  it('builds the prompt context from the chat desktop', async () => {
    const chat = await service.newChat(desktopId)
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    expect(JSON.parse(service.contextOfSession(sessionId)!)).toMatchObject({ desktopId, tools: enabledToolGroups([]) })
    expect(service.contextOfSession(f.sessionId)).toBeNull() // the fixture chat has no desktop
  })

  it('starts chats in the given working directory (default: the agent home)', async () => {
    const home = await service.newChat(desktopId)
    const project = await service.newChat(desktopId, undefined, 'E:\\')
    const cwdOf = (w: typeof home): string => f.repos.sessions.get(w.view.app === 'chat' ? w.view.sessionId : 0)!.cwd
    expect(cwdOf(home)).toBe('C:\\Users\\Agent')
    expect(cwdOf(project)).toBe('E:\\')
  })

  it('uses a changed desktop agent for new chats and sidebars while keeping existing chats', async () => {
    const old = await service.newChat(desktopId)
    const oldId = old.view.app === 'chat' ? old.view.sessionId : 0
    const originalAgent = f.repos.sessions.get(oldId)!.agentId
    const other = f.repos.agents.create({ name: 'Other ACP agent', command: 'other', args: [], env: {} })
    service.setAgent(desktopId, other.id)
    const fresh = await service.newChat(desktopId)
    const freshId = fresh.view.app === 'chat' ? fresh.view.sessionId : 0
    const app = service.openWindow({ desktopId, app: 'control-centre' })
    const aside = await service.openAside(desktopId, app.id)
    expect(service.state(desktopId).agentId).toBe(other.id)
    expect(f.repos.sessions.get(freshId)!.agentId).toBe(other.id)
    expect(f.repos.sessions.get(aside)!.agentId).toBe(other.id)
    expect(f.repos.sessions.get(oldId)!.agentId).toBe(originalAgent)
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

describe('DesktopService: the chat pane (aside sessions)', () => {
  const asideOf = (windowId: number): number | undefined => service.state(desktopId).windows.find((w) => w.id === windowId)?.asideSessionId

  it('creates the aside lazily, once per window, with the role aside and the agent home as its directory', async () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad', path: 'C:\\Users\\Agent\\a.txt' })
    expect(asideOf(notepad.id)).toBeUndefined()
    expect(chats.created).toBe(0)
    const id = await service.openAside(desktopId, notepad.id)
    expect(await service.openAside(desktopId, notepad.id)).toBe(id)
    expect(chats.created).toBe(1)
    expect(asideOf(notepad.id)).toBe(id)
    expect(f.repos.sessions.get(id)).toMatchObject({ role: 'aside', cwd: 'C:\\Users\\Agent' })
    expect(changes().at(-1)?.windows.find((w) => w.id === notepad.id)?.asideSessionId).toBe(id)
  })

  it('two quick first messages share one session', async () => {
    const explorer = service.openWindow({ desktopId, app: 'explorer' })
    const [a, b] = await Promise.all([service.openAside(desktopId, explorer.id), service.openAside(desktopId, explorer.id)])
    expect(a).toBe(b)
    expect(chats.created).toBe(1)
  })

  it('works on the drive the window shows', async () => {
    const code = service.openWindow({ desktopId, app: 'code', path: 'E:\\src\\index.ts' })
    const id = await service.openAside(desktopId, code.id)
    expect(f.repos.sessions.get(id)?.cwd).toBe('E:\\')
  })

  it('has no pane in Chat, Code Review or a surface window', async () => {
    const chat = await service.newChat(desktopId)
    await expect(service.openAside(desktopId, chat.id)).rejects.toThrow(/no chat pane/)
  })

  it('refuses a window of another desktop', async () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    await expect(service.openAside(desktopId + 99, notepad.id)).rejects.toThrow()
  })

  it('closing the window keeps a pane chat the user wrote in as a chat', async () => {
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    const id = await service.openAside(desktopId, notepad.id)
    say(id)
    service.closeWindow(notepad.id)
    expect(chats.removed).not.toContain(id)
    expect(f.repos.sessions.get(id)).toMatchObject({ role: 'chat' })
  })

  it('New conversation keeps the conversation as a chat and blanks the pane', async () => {
    const browser = service.openWindow({ desktopId, app: 'browser', url: 'https://example.com/' })
    const first = await service.openAside(desktopId, browser.id)
    say(first)
    await service.closeAside(browser.id)
    expect(f.repos.sessions.get(first)).toMatchObject({ role: 'chat' })
    expect(asideOf(browser.id)).toBeUndefined()
    const second = await service.openAside(desktopId, browser.id)
    expect(second).not.toBe(first)
  })

  it('Open as a chat window moves the pane conversation to a Chat window', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    expect(service.openAsideAsChat(code.id)).toBeNull() // nothing in the pane yet
    const id = await service.openAside(desktopId, code.id)
    expect(service.openAsideAsChat(code.id)).toBeNull() // no message yet: nothing to keep
    say(id)
    const chat = service.openAsideAsChat(code.id)
    expect(chat?.view).toMatchObject({ app: 'chat', sessionId: id })
    expect(f.repos.sessions.get(id)).toMatchObject({ role: 'chat' })
    expect(asideOf(code.id)).toBeUndefined()
    service.closeWindow(code.id)
    expect(f.repos.sessions.get(id)).not.toBeNull()
  })

  it('closing the window deletes an aside session with no message', async () => {
    const terminal = service.openWindow({ desktopId, app: 'terminal' })
    const id = await service.openAside(desktopId, terminal.id)
    service.closeWindow(terminal.id)
    expect(chats.removed).toContain(id)
    expect(f.repos.sessions.get(id)).toBeNull()
  })

  it('New conversation deletes the session, keeps the window and lets the next message start a fresh one', async () => {
    const browser = service.openWindow({ desktopId, app: 'browser', url: 'https://example.com/' })
    const first = await service.openAside(desktopId, browser.id)
    await service.closeAside(browser.id)
    expect(f.repos.sessions.get(first)).toBeNull()
    expect(service.state(desktopId).windows.map((w) => w.id)).toContain(browser.id)
    expect(asideOf(browser.id)).toBeUndefined()
    expect(changes().at(-1)?.windows.find((w) => w.id === browser.id)?.asideSessionId).toBeUndefined()
    const second = await service.openAside(desktopId, browser.id)
    expect(chats.created).toBe(2)
    expect(f.repos.sessions.get(second)).toMatchObject({ role: 'aside' })
    expect(asideOf(browser.id)).toBe(second)
    await expect(service.closeAside(service.openWindow({ desktopId, app: 'paint' }).id)).resolves.toBeUndefined()
  })

  it('does not delete a chat when its window closes, and an aside is not a chat', async () => {
    const chat = await service.newChat(desktopId)
    const notepad = service.openWindow({ desktopId, app: 'notepad' })
    const aside = await service.openAside(desktopId, notepad.id)
    expect(f.repos.sessions.listByDesktop(desktopId).filter((s) => s.role === 'chat').map((s) => s.id)).not.toContain(aside)
    service.closeWindow(chat.id)
    expect(chats.removed).not.toContain(chat.view.app === 'chat' ? chat.view.sessionId : -1)
  })
})

describe('DesktopService: Teams and Team Chat windows', () => {
  it('opens Teams once per desktop', () => {
    const first = service.openWindow({ desktopId, app: 'teams' })
    expect(service.openWindow({ desktopId, app: 'teams' }).id).toBe(first.id)
    expect(first.view).toMatchObject({ app: 'teams', tab: 'teams' })
  })

  it('opens one Team Chat window per room, with the room in its view, and remembers it', () => {
    const one = service.openWindow({ desktopId, app: 'team-chat', roomId: 7 })
    const two = service.openWindow({ desktopId, app: 'team-chat', roomId: 8 })
    expect(service.openWindow({ desktopId, app: 'team-chat', roomId: 7 }).id).toBe(one.id)
    expect(two.id).not.toBe(one.id)
    expect(one.view).toMatchObject({ app: 'team-chat', roomId: 7 })
    // A new service over the same rows (a restart) rebuilds the view from the stored room number.
    const again = new DesktopService(deps())
    expect(again.state(desktopId).windows.find((w) => w.id === two.id)?.view).toMatchObject({ app: 'team-chat', roomId: 8 })
    expect(() => service.openWindow({ desktopId, app: 'team-chat' })).toThrow(/needs a room/)
  })

  it('does not remove the room sessions when a Team Chat window closes', () => {
    const win = service.openWindow({ desktopId, app: 'team-chat', roomId: 7 })
    service.closeWindow(win.id)
    expect(chats.removed).toEqual([])
  })
})

describe('DesktopService: foreground chat', () => {
  const chat = async (): Promise<SessionDto> => chats.create(desktopId, undefined, undefined, 'chat')

  it('is the chat of the focused Chat window, and none when another app has the focus', async () => {
    const a = await chat()
    const b = await chat()
    service.openWindow({ desktopId, app: 'chat', sessionId: a.id })
    const bw = service.openWindow({ desktopId, app: 'chat', sessionId: b.id })
    expect(service.foregroundSessionId(desktopId)).toBe(b.id)
    service.openWindow({ desktopId, app: 'notepad' })
    expect(service.foregroundSessionId(desktopId)).toBeNull()
    service.focusWindow(bw.id)
    expect(service.foregroundSessionId(desktopId)).toBe(b.id)
  })

  it('is the review session of a focused Code Review window', async () => {
    const review = await service.openReview(desktopId, 'C:\\Users\\Agent')
    const sessionId = review.view.app === 'code-review' ? review.view.sessionId : -1
    expect(service.foregroundSessionId(desktopId)).toBe(sessionId)
  })

  it('is the chat pane of a focused window only after the operator focused or typed in that pane', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    const pane = await service.openAside(desktopId, code.id)
    expect(service.foregroundSessionId(desktopId)).toBeNull()
    service.notePaneFocus(code.id, true)
    expect(service.foregroundSessionId(desktopId)).toBe(pane)
    // Another window takes the focus: the pane is not the foreground chat any more, until Code is focused again.
    service.openWindow({ desktopId, app: 'notepad' })
    expect(service.foregroundSessionId(desktopId)).toBeNull()
    service.focusWindow(code.id)
    expect(service.foregroundSessionId(desktopId)).toBe(pane)
    // Hiding the pane: the window has no foreground chat.
    service.notePaneFocus(code.id, false)
    expect(service.foregroundSessionId(desktopId)).toBeNull()
  })

  it('forgets the pane when its window closes, and is null for a desktop that does not exist', async () => {
    const code = service.openWindow({ desktopId, app: 'code' })
    await service.openAside(desktopId, code.id)
    service.notePaneFocus(code.id, true)
    service.closeWindow(code.id)
    expect(service.foregroundSessionId(desktopId)).toBeNull()
    expect(service.foregroundSessionId(9999)).toBeNull()
  })
})

describe('DesktopService: presence (Follow and identities)', () => {
  it('the state carries the followed chat and the identity of each chat with a window', async () => {
    const a = await chats.create(desktopId, undefined, undefined, 'chat')
    expect(service.state(desktopId)).toMatchObject({ following: null, identities: {} })
    service.openWindow({ desktopId, app: 'chat', sessionId: a.id })
    service.attachPresence({
      following: () => ({ sessionId: a.id, keep: false, identity: { name: 'Builder', color: '#123456' } }),
      identities: (_desktopId, ids) => Object.fromEntries(ids.map((id) => [String(id), { name: `Agent ${id}`, color: '#123456' }]))
    })
    const state = service.state(desktopId)
    expect(state.following).toMatchObject({ sessionId: a.id })
    expect(state.identities).toEqual({ [String(a.id)]: { name: `Agent ${a.id}`, color: '#123456' } })
  })
})
