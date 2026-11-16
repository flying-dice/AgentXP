import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'
import { SqliteAgentRepository } from './sqlite-agent-repository'

function legacyDatabase() {
  const db = openRaw(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db, MIGRATIONS.slice(0, 3))
  const agentId = new SqliteAgentRepository(db).getDefault()!.id
  db.exec(`
    INSERT INTO folders (path, name) VALUES ('/work/a', 'a'), ('/work/b', 'b');
    INSERT INTO desktops (folder_id, agent_id, title, is_open, created_at) VALUES
      (1, ${agentId}, 'Alpha', 1, '2026-01-01T00:00:00.000Z'),
      (2, ${agentId}, 'Beta', 0, '2026-02-01T00:00:00.000Z');
    INSERT INTO sessions (folder_id, agent_id, desktop_id, title, updated_at) VALUES
      (1, ${agentId}, 1, 'a1', '2026-03-01T00:00:00.000Z'),
      (1, ${agentId}, 1, 'a2', '2026-03-05T00:00:00.000Z'),
      (2, ${agentId}, 2, 'b1', '2026-03-02T00:00:00.000Z');
    INSERT INTO file_changes (session_id, path, kind, original_text, current_text) VALUES
      (1, 'src/a.ts', 'modified', 'x', 'y'),
      (3, 'b.txt', 'added', NULL, 'z');
    INSERT INTO recycled_changes (desktop_id, session_id, path, reverted_text, restored_text) VALUES (1, 1, 'src/old.ts', 'r', 's');
    INSERT INTO app_windows (id, desktop_id, kind, x, y, width, height, window_state, z_order, opened_by) VALUES
      (1, 1, 'code', 0, 0, 300, 200, 'normal', 1, 'user'),
      (2, 1, 'explorer', 0, 0, 300, 200, 'normal', 2, 'user');
    INSERT INTO path_windows (window_id, relative_path) VALUES (1, 'src/a.ts'), (2, '');
  `)
  return { db, agentId }
}

describe('migration 004 on a database with desktops, chats and changes', () => {
  it('moves each desktop folder into drive E: and drops folder_id', () => {
    const { db } = legacyDatabase()
    expect(migrate(db)).toBe(MIGRATIONS.length)
    expect(db.prepare('SELECT desktop_id, letter, folder_id FROM desktop_drives ORDER BY desktop_id').all()).toEqual([
      { desktop_id: 1, letter: 'E', folder_id: 1 },
      { desktop_id: 2, letter: 'E', folder_id: 2 }
    ])
    const columns = (table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name)
    expect(columns('desktops')).not.toContain('folder_id')
    expect(columns('desktops')).toContain('last_used_at')
    expect(columns('sessions')).not.toContain('folder_id')
    expect(columns('sessions')).toContain('cwd')
  })

  it('keeps desktops (is_open kept as connected) and sets last_used_at from the latest chat', () => {
    const { db } = legacyDatabase()
    migrate(db)
    expect(db.prepare('SELECT title, is_open, last_used_at FROM desktops ORDER BY id').all()).toEqual([
      { title: 'Alpha', is_open: 1, last_used_at: '2026-03-05T00:00:00.000Z' },
      { title: 'Beta', is_open: 0, last_used_at: '2026-03-02T00:00:00.000Z' }
    ])
  })

  it('gives existing chats the cwd E:\\ and keeps their desktops', () => {
    const { db } = legacyDatabase()
    migrate(db)
    expect(db.prepare('SELECT title, desktop_id, cwd FROM sessions ORDER BY id').all()).toEqual([
      { title: 'a1', desktop_id: 1, cwd: 'E:\\' },
      { title: 'a2', desktop_id: 1, cwd: 'E:\\' },
      { title: 'b1', desktop_id: 2, cwd: 'E:\\' }
    ])
  })

  it('stores changes by folder and relative path, in both change tables', () => {
    const { db } = legacyDatabase()
    migrate(db)
    expect(db.prepare('SELECT session_id, folder_id, path, kind FROM file_changes ORDER BY id').all()).toEqual([
      { session_id: 1, folder_id: 1, path: 'src/a.ts', kind: 'modified' },
      { session_id: 3, folder_id: 2, path: 'b.txt', kind: 'added' }
    ])
    expect(db.prepare('SELECT folder_id, path FROM recycled_changes').all()).toEqual([{ folder_id: 1, path: 'src/old.ts' }])
  })

  it('turns window paths into VPaths on E:', () => {
    const { db } = legacyDatabase()
    migrate(db)
    expect(db.prepare('SELECT window_id, path FROM path_windows ORDER BY window_id').all()).toEqual([
      { window_id: 1, path: 'E:\\src\\a.ts' },
      { window_id: 2, path: 'E:\\' }
    ])
  })

  it('leaves no dangling foreign keys, keeps foreign keys on, and keeps cascades working', () => {
    const { db } = legacyDatabase()
    migrate(db)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    expect((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys).toBe(1)
    db.exec('DELETE FROM desktops WHERE id = 1')
    const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n
    expect(n('SELECT COUNT(*) AS n FROM sessions')).toBe(1)
    expect(n('SELECT COUNT(*) AS n FROM desktop_drives')).toBe(1)
    expect(n('SELECT COUNT(*) AS n FROM file_changes')).toBe(1)
    expect(n('SELECT COUNT(*) AS n FROM app_windows')).toBe(0)
    expect(n('SELECT COUNT(*) AS n FROM recycled_changes')).toBe(0)
  })

  it('migrates an empty database and enforces the drive letter check', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    expect(migrate(db)).toBe(MIGRATIONS.length)
    db.exec("INSERT INTO desktops (title) VALUES ('d'); INSERT INTO folders (path, name) VALUES ('/x', 'x')")
    expect(() => db.exec("INSERT INTO desktop_drives (desktop_id, letter, folder_id) VALUES (1, 'C', 1)")).toThrow()
    db.exec("INSERT INTO desktop_drives (desktop_id, letter, folder_id) VALUES (1, 'E', 1)")
    expect(() => db.exec("INSERT INTO desktop_drives (desktop_id, letter, folder_id) VALUES (1, 'F', 1)")).toThrow()
  })
})
