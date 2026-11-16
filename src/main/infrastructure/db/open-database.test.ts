import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS, type Migration } from './migrations'
import { openDatabase } from './open-database'
import { readPragma } from './sql'

describe('openDatabase', () => {
  it('enables foreign keys and migrates to the latest version', () => {
    const db = openDatabase(':memory:')
    expect(readPragma(db, 'foreign_keys')).toBe(1)
    expect(readPragma(db, 'user_version')).toBe(MIGRATIONS[MIGRATIONS.length - 1].version)
    expect(readPragma(db, 'busy_timeout')).toBeGreaterThan(0)
  })

  it('uses WAL for file databases and creates parent directories', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentxp-db-'))
    try {
      const db = openDatabase(join(dir, 'nested', 'app.db'))
      expect(readPragma(db, 'journal_mode')).toBe('wal')
      db.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('seeds exactly one default agent', () => {
    const db = openDatabase(':memory:')
    const agents = db.prepare('SELECT id, name, command, is_default FROM agents').all()
    expect(agents).toEqual([{ id: 1, name: 'Claude Code', command: 'npx', is_default: 1 }])
    expect(db.prepare('SELECT value FROM agent_args ORDER BY position').all()).toEqual([
      { value: '-y' },
      { value: '@zed-industries/claude-code-acp' }
    ])
  })

  it('has no foreign key violations after migration', () => {
    expect(openDatabase(':memory:').prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
})

describe('migrate', () => {
  const m = (version: number, sql: string): Migration => ({ version, name: `m${version}`, sql })

  it('is idempotent', () => {
    const db = openDatabase(':memory:')
    expect(migrate(db)).toBe(1)
    expect(migrate(db)).toBe(1)
  })

  it('applies only pending migrations in order', () => {
    const db = openDatabase(':memory:')
    const next = [...MIGRATIONS, m(2, 'CREATE TABLE extra (id INTEGER PRIMARY KEY)'), m(3, 'ALTER TABLE extra ADD COLUMN v TEXT')]
    expect(migrate(db, next)).toBe(3)
    expect(db.prepare('PRAGMA table_info(extra)').all()).toHaveLength(2)
  })

  it('rolls a failing migration back and keeps the version', () => {
    const db = openDatabase(':memory:')
    const bad = m(2, 'CREATE TABLE half (id INTEGER); THIS IS NOT SQL;')
    expect(() => migrate(db, [...MIGRATIONS, bad])).toThrow()
    expect(readPragma(db, 'user_version')).toBe(1)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'half'").get()).toBeUndefined()
  })

  it('rejects unordered migrations', () => {
    const db = openDatabase(':memory:')
    expect(() => migrate(db, [m(2, 'SELECT 1'), m(2, 'SELECT 1')])).toThrow(/ordered/)
  })
})
