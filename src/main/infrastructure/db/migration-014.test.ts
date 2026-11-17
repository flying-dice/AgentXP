import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

describe('migration 014 (teams)', () => {
  it('adds the tables on top of an existing database and registers the new apps', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, MIGRATIONS.filter((m) => m.version < 14))
    migrate(db)
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name)
    for (const name of ['skills', 'mcp_servers', 'mcp_server_tools', 'profiles', 'teams', 'team_members', 'rooms', 'room_messages', 'room_members']) expect(tables).toContain(name)
    const kinds = (db.prepare('SELECT kind FROM app_kinds').all() as { kind: string }[]).map((k) => k.kind)
    expect(kinds).toEqual(expect.arrayContaining(['teams', 'team-chat']))
  })
})
