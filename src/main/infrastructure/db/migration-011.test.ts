import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

describe('migration 011 (stopped by pause)', () => {
  it('adds the table of stopped chats on top of an existing database, whatever other versions come before it', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, MIGRATIONS.filter((m) => m.version < 11))
    migrate(db)
    expect(MIGRATIONS.find((m) => m.version === 11)).toMatchObject({ name: 'stopped_by_pause' })
    const columns = db.prepare('PRAGMA table_info(desktop_stopped_chats)').all() as Array<{ name: string }>
    expect(columns.map((c) => c.name)).toEqual(['desktop_id', 'session_id'])
  })

  it('deleting the chat or the desktop deletes its row', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db)
    const agentId = (db.prepare('SELECT id FROM agents WHERE is_default = 1').get() as { id: number }).id
    db.exec(`INSERT INTO desktops (title, is_open, created_at) VALUES ('D', 0, '2026-01-01T00:00:00.000Z')`)
    db.exec(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (${agentId}, 1, 'a', 'chat'), (${agentId}, 1, 'b', 'chat')`)
    db.exec('INSERT INTO desktop_stopped_chats (desktop_id, session_id) VALUES (1, 1), (1, 2)')
    db.exec('DELETE FROM sessions WHERE id = 1')
    expect(db.prepare('SELECT session_id FROM desktop_stopped_chats').all()).toEqual([{ session_id: 2 }])
    db.exec('DELETE FROM desktops WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM desktop_stopped_chats').get()).toEqual({ n: 0 })
  })
})
