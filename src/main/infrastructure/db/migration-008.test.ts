import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

function seeded(upTo: number) {
  const db = openRaw(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db, MIGRATIONS.slice(0, upTo))
  const agentId = (db.prepare('SELECT id FROM agents WHERE is_default = 1').get() as { id: number }).id
  db.exec(`INSERT INTO desktops (title, is_open, created_at) VALUES ('D', 0, '2026-01-01T00:00:00.000Z')`)
  db.exec(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (${agentId}, 1, 'pane', 'aside')`)
  db.exec(`INSERT INTO app_windows (desktop_id, kind, x, y, width, height, window_state, z_order, opened_by) VALUES (1, 'notepad', 0, 0, 300, 200, 'normal', 1, 'user')`)
  return db
}

describe('migration 008 (aside windows)', () => {
  it('adds aside_windows on top of an existing database', () => {
    const db = seeded(7)
    expect(migrate(db)).toBe(MIGRATIONS.length)
    expect(MIGRATIONS[7]).toMatchObject({ version: 8, name: 'aside_windows' })
    expect((db.prepare('PRAGMA table_info(aside_windows)').all() as Array<{ name: string }>).map((c) => c.name)).toEqual(['window_id', 'session_id'])
  })

  it('deleting the window deletes the link; deleting the session deletes the link and keeps the window', () => {
    const db = seeded(8)
    db.exec('INSERT INTO aside_windows (window_id, session_id) VALUES (1, 1)')
    db.exec('DELETE FROM sessions WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM aside_windows').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM app_windows').get()).toEqual({ n: 1 })
    const again = Number(db.prepare(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (1, 1, 'again', 'aside')`).run().lastInsertRowid)
    db.prepare('INSERT INTO aside_windows (window_id, session_id) VALUES (1, ?)').run(again)
    db.exec('DELETE FROM app_windows WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM aside_windows').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(again)).toEqual({ n: 1 })
  })

  it('one session belongs to at most one window', () => {
    const db = seeded(8)
    db.exec(`INSERT INTO app_windows (desktop_id, kind, x, y, width, height, window_state, z_order, opened_by) VALUES (1, 'terminal', 0, 0, 300, 200, 'normal', 2, 'user')`)
    db.exec('INSERT INTO aside_windows (window_id, session_id) VALUES (1, 1)')
    expect(() => db.exec('INSERT INTO aside_windows (window_id, session_id) VALUES (2, 1)')).toThrow(/UNIQUE/)
  })
})

describe('migration 009 (agent default mode)', () => {
  it('adds a nullable default_mode_id that keeps existing agents on the agent default', () => {
    const db = seeded(8)
    const before = db.prepare('SELECT id FROM agents').all()
    expect(migrate(db)).toBe(MIGRATIONS.length)
    expect(MIGRATIONS[8]).toMatchObject({ version: 9, name: 'agent_default_mode' })
    expect(db.prepare('SELECT id, default_mode_id FROM agents').all()).toEqual(before.map((a) => ({ ...(a as object), default_mode_id: null })))
  })
})
