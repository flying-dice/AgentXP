import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

describe('migration 006 (help app)', () => {
  it('adds the help app kind so a help window row does not break the foreign key', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, MIGRATIONS.slice(0, 5))
    expect(db.prepare("SELECT kind FROM app_kinds WHERE kind = 'help'").all()).toEqual([])
    migrate(db)
    expect(db.prepare("SELECT kind FROM app_kinds WHERE kind = 'help'").all()).toEqual([{ kind: 'help' }])
    db.exec(`INSERT INTO desktops (title, is_open, created_at) VALUES ('D', 0, '2026-01-01T00:00:00.000Z')`)
    const columns = (db.prepare('PRAGMA table_info(app_windows)').all() as Array<{ name: string }>).map((c) => c.name)
    expect(columns).toContain('kind')
  })

  it('is safe to run when the row exists', () => {
    const db = openRaw(':memory:')
    migrate(db)
    expect(() => db.exec("INSERT OR IGNORE INTO app_kinds (kind) VALUES ('help')")).not.toThrow()
  })
})
