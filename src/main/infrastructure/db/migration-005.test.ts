import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

function database(upTo: number) {
  const db = openRaw(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db, MIGRATIONS.slice(0, upTo))
  return db
}

/** A desktop, a chat with one surface (inserted the way migration 001 stores it) and an agent. */
function seed(db: ReturnType<typeof openRaw>) {
  const agentId = (db.prepare('SELECT id FROM agents WHERE is_default = 1').get() as { id: number }).id
  db.exec(`INSERT INTO desktops (title, is_open, created_at) VALUES ('D', 0, '2026-01-01T00:00:00.000Z')`)
  db.exec(`INSERT INTO sessions (agent_id, desktop_id, title) VALUES (${agentId}, 1, 'c')`)
  db.exec(`INSERT INTO transcript_entries (session_id, seq, kind) VALUES (1, 1, 'a2ui')`)
  db.exec(`INSERT INTO a2ui_surfaces (entry_id, session_id, surface_id, title, catalog_id) VALUES (1, 1, 's', 'T', 'c')`)
}

describe('migration 005 (surface windows)', () => {
  it('seeds the surface app kind, makes existing surfaces inline and visible, and creates surface_windows', () => {
    const db = database(4)
    seed(db)
    expect(migrate(db)).toBe(MIGRATIONS[MIGRATIONS.length - 1].version)
    expect(db.prepare("SELECT kind FROM app_kinds WHERE kind = 'surface'").all()).toEqual([{ kind: 'surface' }])
    expect(db.prepare('SELECT target, hidden FROM a2ui_surfaces').all()).toEqual([{ target: 'inline', hidden: 0 }])
    const columns = (db.prepare('PRAGMA table_info(surface_windows)').all() as Array<{ name: string }>).map((c) => c.name)
    expect(columns).toEqual(['window_id', 'surface_id'])
  })

  it('only accepts the three targets and 0/1 for hidden', () => {
    const db = database(5)
    seed(db)
    for (const target of ['inline', 'sidebar', 'window']) {
      expect(() => db.exec(`UPDATE a2ui_surfaces SET target = '${target}'`)).not.toThrow()
    }
    expect(() => db.exec(`UPDATE a2ui_surfaces SET target = 'chat'`)).toThrow(/CHECK/)
    expect(() => db.exec(`UPDATE a2ui_surfaces SET hidden = 2`)).toThrow(/CHECK/)
  })

  it('is one window per surface, cascades both ways (surface -> window row via trigger, window -> subtype row)', () => {
    const db = database(5)
    seed(db)
    const window = (id: number) =>
      db.exec(`INSERT INTO app_windows (id, desktop_id, kind, x, y, width, height, window_state, z_order, opened_by) VALUES (${id}, 1, 'surface', 0, 0, 480, 360, 'normal', ${id}, 'agent')`)
    window(1)
    db.exec('INSERT INTO surface_windows (window_id, surface_id) VALUES (1, 1)')
    window(2)
    expect(() => db.exec('INSERT INTO surface_windows (window_id, surface_id) VALUES (2, 1)')).toThrow(/UNIQUE/)
    db.exec('DELETE FROM app_windows WHERE id = 2')

    db.exec('DELETE FROM app_windows WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM surface_windows').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM a2ui_surfaces').get()).toEqual({ n: 1 }) // closing keeps the surface

    window(3)
    db.exec('INSERT INTO surface_windows (window_id, surface_id) VALUES (3, 1)')
    db.exec('DELETE FROM transcript_entries')
    expect(db.prepare('SELECT COUNT(*) AS n FROM app_windows').get()).toEqual({ n: 0 })
  })
})
