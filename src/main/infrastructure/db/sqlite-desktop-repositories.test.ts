import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'
import { SqliteAgentRepository } from './sqlite-agent-repository'
import { SqliteAppWindowRepository } from './sqlite-app-window-repository'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteToolPolicyRepository } from './sqlite-tool-policy-repository'
import { count, createFixture } from './test-helpers'

const bounds = { x: 1, y: 2, width: 300, height: 200 }

function setup() {
  const f = createFixture()
  const desktops = new SqliteDesktopRepository(f.db)
  const windows = new SqliteAppWindowRepository(f.db)
  const desktop = desktops.create({ folderId: f.folderId, agentId: f.agentId, title: 'project', isOpen: true })
  return { ...f, desktops, windows, desktop, sessions: new SqliteSessionRepository(f.db) }
}

describe('SqliteDesktopRepository', () => {
  it('creates, lists, flags and removes desktops', () => {
    const { desktops, desktop, folderId } = setup()
    expect(desktop).toMatchObject({ folderId, title: 'project', isOpen: true, paused: false, userInControl: false })
    expect(desktops.findByFolder(folderId)?.id).toBe(desktop.id)
    expect(desktops.listOpen()).toHaveLength(1)

    desktops.setOpen(desktop.id, false)
    desktops.setPaused(desktop.id, true)
    desktops.setUserInControl(desktop.id, true)
    desktops.rename(desktop.id, 'renamed')
    expect(desktops.listOpen()).toEqual([])
    expect(desktops.get(desktop.id)).toMatchObject({ isOpen: false, paused: true, userInControl: true, title: 'renamed' })

    expect(desktops.remove(desktop.id)).toBe(true)
    expect(desktops.list()).toEqual([])
  })

  it('removes the chats of a deleted desktop (cascade)', () => {
    const { db, desktops, desktop, sessions, folderId, agentId } = setup()
    const session = sessions.create({ folderId, agentId, desktopId: desktop.id, title: 'chat' })
    expect(sessions.get(session.id)?.desktopId).toBe(desktop.id)
    expect(sessions.listByDesktop(desktop.id).map((s) => s.id)).toEqual([session.id])
    desktops.remove(desktop.id)
    expect(sessions.get(session.id)).toBeNull()
    expect(count(db, 'app_windows')).toBe(0)
  })
})

describe('SqliteAppWindowRepository', () => {
  it('stores windows with their subtype columns, back to front', () => {
    const { windows, desktop, sessions, folderId, agentId } = setup()
    const session = sessions.create({ folderId, agentId, desktopId: desktop.id, title: 'chat' })
    const chat = windows.create({ desktopId: desktop.id, app: 'chat', bounds, windowState: 'normal', openedBy: 'user', sessionId: session.id })
    const notepad = windows.create({ desktopId: desktop.id, app: 'notepad', bounds, windowState: 'normal', openedBy: 'agent', path: 'a.txt' })
    const browser = windows.create({ desktopId: desktop.id, app: 'browser', bounds, windowState: 'normal', openedBy: 'user', url: 'https://example.com/' })

    expect(windows.list(desktop.id).map((w) => w.id)).toEqual([chat.id, notepad.id, browser.id])
    expect(chat).toMatchObject({ sessionId: session.id, path: null, url: null, bounds })
    expect(notepad).toMatchObject({ path: 'a.txt', openedBy: 'agent' })
    expect(browser.url).toBe('https://example.com/')
    expect(windows.findChatWindow(session.id)?.id).toBe(chat.id)

    windows.raise(chat.id)
    expect(windows.list(desktop.id).at(-1)?.id).toBe(chat.id)
    windows.setBounds(notepad.id, { x: 5, y: 6, width: 400.4, height: 300 })
    windows.setWindowState(notepad.id, 'minimized')
    windows.setPath(notepad.id, 'b.txt')
    windows.setUrl(browser.id, 'https://example.org/')
    expect(windows.get(notepad.id)).toMatchObject({ bounds: { x: 5, y: 6, width: 400, height: 300 }, windowState: 'minimized', path: 'b.txt' })
    windows.setPath(notepad.id, null)
    expect(windows.get(notepad.id)?.path).toBeNull()
    expect(windows.get(browser.id)?.url).toBe('https://example.org/')
  })

  it('deletes the window row when its chat is deleted, and one window per chat', () => {
    const { db, windows, desktop, sessions, folderId, agentId } = setup()
    const session = sessions.create({ folderId, agentId, desktopId: desktop.id, title: 'chat' })
    windows.create({ desktopId: desktop.id, app: 'chat', bounds, windowState: 'normal', openedBy: 'user', sessionId: session.id })
    expect(() =>
      windows.create({ desktopId: desktop.id, app: 'chat', bounds, windowState: 'normal', openedBy: 'user', sessionId: session.id })
    ).toThrow()
    expect(count(db, 'app_windows')).toBe(1) // the failed insert rolled back
    sessions.remove(session.id)
    expect(count(db, 'app_windows')).toBe(0)
  })
})

describe('SqliteToolPolicyRepository', () => {
  it('upserts decisions', () => {
    const { db } = setup()
    const policies = new SqliteToolPolicyRepository(db)
    expect(policies.all()).toEqual({})
    policies.set('terminal', 'deny')
    policies.set('terminal', 'ask')
    policies.set('openApps', 'allow')
    expect(policies.all()).toEqual({ terminal: 'ask', openApps: 'allow' })
    expect(() => policies.set('terminal', 'maybe' as never)).toThrow()
  })
})

describe('migration 002 on an existing database', () => {
  it('gives every folder with sessions a desktop, assigns the sessions and opens only the latest one', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, [MIGRATIONS[0]!])
    const agentId = new SqliteAgentRepository(db).getDefault()!.id
    db.exec(`
      INSERT INTO folders (path, name) VALUES ('/a', 'a'), ('/b', 'b'), ('/empty', 'empty');
      INSERT INTO sessions (folder_id, agent_id, title, updated_at) VALUES
        (1, ${agentId}, 'a1', '2026-01-01T00:00:00.000Z'),
        (1, ${agentId}, 'a2', '2026-01-02T00:00:00.000Z'),
        (2, ${agentId}, 'b1', '2026-03-01T00:00:00.000Z');`)

    migrate(db)

    const desktops = db.prepare('SELECT folder_id, agent_id, title, is_open FROM desktops ORDER BY folder_id').all()
    expect(desktops).toEqual([
      { folder_id: 1, agent_id: agentId, title: 'a', is_open: 0 },
      { folder_id: 2, agent_id: agentId, title: 'b', is_open: 1 }
    ])
    expect(db.prepare('SELECT title, desktop_id FROM sessions ORDER BY id').all()).toEqual([
      { title: 'a1', desktop_id: 1 },
      { title: 'a2', desktop_id: 1 },
      { title: 'b1', desktop_id: 2 }
    ])
    expect(db.prepare('SELECT kind FROM app_kinds ORDER BY kind').all()).toHaveLength(14)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })

  it('is a no-op for data when there are no sessions', () => {
    const db = openRaw(':memory:')
    migrate(db, [MIGRATIONS[0]!])
    db.exec("INSERT INTO folders (path, name) VALUES ('/a', 'a')")
    migrate(db)
    expect(db.prepare('SELECT COUNT(*) AS n FROM desktops').get()).toEqual({ n: 0 })
  })
})
