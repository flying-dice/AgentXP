import { beforeEach, describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiServerMessage, type A2uiSurfaceTarget } from '@shared/a2ui'
import type { SessionDto } from '@shared/models'
import { SqliteAppWindowRepository } from '../infrastructure/db/sqlite-app-window-repository'
import { SqliteStickyNoteRepository } from '../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../infrastructure/db/sqlite-tool-policy-repository'
import { A2uiService } from './A2uiService'
import { DesktopService } from './desktop/DesktopService'
import { createVfsFixture } from './test-helpers'

const v = 'v0.9' as const
let f: Awaited<ReturnType<typeof createVfsFixture>>
let desktops: DesktopService
let a2ui: A2uiService
let sessionId: number
let desktopId: number

const create = (surfaceId: string, title?: string, theme: Record<string, unknown> = {}): A2uiServerMessage => ({
  version: v,
  createSurface: { surfaceId, catalogId: A2UI_CATALOG_ID, theme: { ...(title ? { title } : {}), ...theme } }
})
const label = (surfaceId: string, text: string): A2uiServerMessage => ({
  version: v,
  updateComponents: { surfaceId, components: [{ id: 'root', component: 'Label', text }] }
})
const render = (messages: A2uiServerMessage[], target?: A2uiSurfaceTarget) => a2ui.apply(String(sessionId), messages, target ? { target } : undefined)
const surfaceWindows = () => desktops.state(desktopId).windows.filter((w) => w.app === 'surface')

beforeEach(async () => {
  f = await createVfsFixture()
  desktopId = f.desktop.id
  desktops = new DesktopService({
    desktops: f.repos.desktops,
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    agents: f.repos.agents,
    sessions: f.repos.sessions,
    notes: new SqliteStickyNoteRepository(f.db),
    surfaces: f.repos.surfaces,
    chats: {
      keepAsChat: () => false,
      create: async () => ({}) as SessionDto,
      cancel: async () => {},
      remove: async () => {}
    },
    drives: f.drives,
    events: f.publisher
  })
  a2ui = new A2uiService(f.repos.surfaces, f.repos.transcripts, f.repos.sessions, f.publisher, { sendHidden: async () => {} })
  a2ui.attachWindows({
    open: (s, id, by, size) => desktops.openSurfaceWindow(s, id, by, size) !== null,
    close: (s, id) => void desktops.closeSurfaceWindow(s, id),
    isOpen: (s, id) => desktops.hasSurfaceWindow(s, id),
    refresh: (s) => desktops.refresh(f.repos.sessions.get(s)!.desktopId!)
  })
  sessionId = f.repos.sessions.create({ agentId: f.agentId, desktopId, title: 'Chat' }).id
})

describe('surface windows: opening', () => {
  it('opens a window for a window surface, titled from the theme, and tells the agent', async () => {
    const result = await render([create('dash', 'Dashboard'), label('dash', 'hi')], 'window')
    expect(result).toEqual({ ok: true, notes: [expect.stringContaining('Shown in its own window "Dashboard"')] })
    expect(surfaceWindows()).toHaveLength(1)
    expect(surfaceWindows()[0]).toMatchObject({
      title: 'Dashboard',
      openedBy: 'agent',
      bounds: { width: 480, height: 360 },
      view: { app: 'surface', surfaceId: 'dash', sessionId, title: 'Dashboard' }
    })
    expect(desktops.state(desktopId).surfaces).toEqual([{ sessionId, surfaceId: 'dash', title: 'Dashboard', target: 'window', state: 'open' }])
  })

  it('falls back to "Agent window" and uses the size hint of the theme', async () => {
    await render([create('a', undefined, { width: 700, height: 100 })], 'window')
    expect(surfaceWindows()[0]).toMatchObject({ title: 'Agent window', bounds: { width: 700, height: 160 } })
  })

  it('inline surfaces open no window and add no note; the target defaults to inline', async () => {
    expect(await render([create('i', 'Form')])).toEqual({ ok: true })
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'i')?.target).toBe('inline')
    expect(desktops.state(desktopId).surfaces[0]).toMatchObject({ target: 'inline', state: 'open' })
  })

  it('a sidebar surface opens no window; a note says where it is', async () => {
    const result = await render([create('side', 'Checklist')], 'sidebar')
    expect(result).toEqual({ ok: true, notes: [expect.stringContaining('sidebar')] })
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'side')).toMatchObject({ target: 'sidebar', hidden: false })
  })

  it('does not steal focus from the chat the user types in: the window opens behind it and flashes', async () => {
    const chat = desktops.openWindow({ desktopId, app: 'chat', sessionId })
    desktops.noteUserActivity(desktopId)
    await render([create('dash', 'Dashboard')], 'window')
    const state = desktops.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(surfaceWindows()[0]).toMatchObject({ attention: true })
    expect(surfaceWindows()[0]!.bounds.x).toBeGreaterThanOrEqual(chat.bounds.x + chat.bounds.width)
  })

  it('a second createSurface opens a second window', async () => {
    await render([create('a', 'A')], 'window')
    await render([create('b', 'B')], 'window')
    expect(surfaceWindows().map((w) => w.title)).toEqual(['A', 'B'])
  })
})

describe('surface windows: hide, update, reopen', () => {
  beforeEach(async () => {
    await render([create('dash', 'Dashboard'), label('dash', 'one'), { version: v, updateDataModel: { surfaceId: 'dash', path: '/n', value: 1 } }], 'window')
  })

  it('closing the window hides the surface: the row goes, the surface and its data stay', () => {
    desktops.closeWindow(surfaceWindows()[0]!.id)
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'dash')).toMatchObject({ dataModel: { n: 1 }, target: 'window' })
    expect(desktops.state(desktopId).surfaces[0]).toMatchObject({ state: 'closed' })
  })

  it('an update by the agent does not reopen a closed window and says so; the surface still updates', async () => {
    desktops.closeWindow(surfaceWindows()[0]!.id)
    const result = await render([label('dash', 'two')])
    expect(result).toEqual({ ok: true, notes: ['Surface "dash": The user closed this window; it updates in the background.'] })
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'dash')?.components[0]).toMatchObject({ text: 'two' })
  })

  it('an update while the window is open stays silent and keeps the same window', async () => {
    const id = surfaceWindows()[0]!.id
    expect(await render([label('dash', 'two')])).toEqual({ ok: true })
    expect(surfaceWindows().map((w) => w.id)).toEqual([id])
  })

  it('the user reopens it: the same surface (with its data) comes back in one window, not two', () => {
    desktops.closeWindow(surfaceWindows()[0]!.id)
    const a = desktops.openWindow({ desktopId, app: 'surface', sessionId, surfaceId: 'dash' })
    const b = desktops.openWindow({ desktopId, app: 'surface', sessionId, surfaceId: 'dash' })
    expect(b.id).toBe(a.id)
    expect(a.openedBy).toBe('user')
    expect(surfaceWindows()).toHaveLength(1)
    expect(f.repos.surfaces.get(sessionId, 'dash')?.dataModel).toEqual({ n: 1 })
  })

  it('a2ui_delete_surface (deleteSurface) closes the window and removes the surface', async () => {
    expect(await render([{ version: v, deleteSurface: { surfaceId: 'dash' } }])).toEqual({ ok: true })
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'dash')).toBeNull()
    expect(desktops.state(desktopId).surfaces).toEqual([])
    expect(f.publisher.payloads('surface.removed').at(-1)).toEqual({ sessionId, surfaceId: 'dash' })
  })

  it('the chat row Delete does the same', () => {
    a2ui.deleteSurface(sessionId, 'dash')
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 'dash')).toBeNull()
    expect(() => a2ui.deleteSurface(sessionId, 'dash')).toThrow(/unknown surface/)
  })

  it('clearing the chat (surface rows deleted) removes the window row through the trigger', () => {
    f.repos.transcripts.clear(sessionId)
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM app_windows WHERE kind = ?').get('surface')).toEqual({ n: 0 })
  })
})

describe('surface placement: move and sidebar tabs', () => {
  it('moves a surface between inline, sidebar and window; the window follows', async () => {
    await render([create('s', 'S'), label('s', 'x')])
    a2ui.moveSurface(sessionId, 's', 'window')
    expect(surfaceWindows()).toHaveLength(1)
    expect(surfaceWindows()[0]).toMatchObject({ openedBy: 'user' })
    expect(f.publisher.payloads('surface.changed').at(-1)).toMatchObject({ target: 'window' })
    a2ui.moveSurface(sessionId, 's', 'sidebar')
    expect(surfaceWindows()).toHaveLength(0)
    expect(f.repos.surfaces.get(sessionId, 's')).toMatchObject({ target: 'sidebar', hidden: false })
    a2ui.moveSurface(sessionId, 's', 'inline')
    expect(f.repos.surfaces.get(sessionId, 's')?.target).toBe('inline')
  })

  it('hides and shows a sidebar tab; an agent update does not show it again and says so', async () => {
    await render([create('s', 'S'), label('s', 'x')], 'sidebar')
    a2ui.setSidebarHidden(sessionId, 's', true)
    expect(desktops.state(desktopId).surfaces[0]).toMatchObject({ target: 'sidebar', state: 'closed' })
    expect(await render([label('s', 'y')])).toEqual({ ok: true, notes: ['Surface "s": The user closed this sidebar tab; it updates in the background.'] })
    expect(f.repos.surfaces.get(sessionId, 's')?.hidden).toBe(true)
    a2ui.setSidebarHidden(sessionId, 's', false)
    expect(desktops.state(desktopId).surfaces[0]).toMatchObject({ state: 'open' })
  })

  it('a chat without a desktop only gets inline surfaces', async () => {
    const lone = f.repos.sessions.create({ agentId: f.agentId, title: 'Lone' }).id
    expect(await a2ui.apply(String(lone), [create('x', 'X')], { target: 'window' })).toEqual({ ok: true })
    expect(f.repos.surfaces.get(lone, 'x')?.target).toBe('inline')
    expect(() => a2ui.moveSurface(lone, 'x', 'window')).toThrow(/not on a desktop/)
  })
})
