import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS, type Migration } from './migrations'
import { openDatabase } from './open-database'
import { openRaw, readPragma } from './sql'

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
    const agents = db.prepare('SELECT id, name, command, is_default, default_model_id FROM agents').all()
    // Claude Code runs the renamed ACP package and new chats start on Sonnet (migration 018).
    expect(agents).toEqual([{ id: 1, name: 'Claude Code', command: 'npx', is_default: 1, default_model_id: 'sonnet' }])
    expect(db.prepare('SELECT value FROM agent_args ORDER BY position').all()).toEqual([
      { value: '-y' },
      { value: '@agentclientprotocol/claude-agent-acp' }
    ])
  })

  it('has no foreign key violations after migration', () => {
    expect(openDatabase(':memory:').prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
})

const LATEST = MIGRATIONS[MIGRATIONS.length - 1].version

describe('migrate', () => {
  const m = (version: number, sql: string): Migration => ({ version, name: `m${version}`, sql })

  it('is idempotent', () => {
    const db = openDatabase(':memory:')
    expect(migrate(db)).toBe(LATEST)
    expect(migrate(db)).toBe(LATEST)
  })

  it('applies only pending migrations in order', () => {
    const db = openDatabase(':memory:')
    const next = [...MIGRATIONS, m(LATEST + 1, 'CREATE TABLE extra (id INTEGER PRIMARY KEY)'), m(LATEST + 2, 'ALTER TABLE extra ADD COLUMN v TEXT')]
    expect(migrate(db, next)).toBe(LATEST + 2)
    expect(db.prepare('PRAGMA table_info(extra)').all()).toHaveLength(2)
  })

  it('rolls a failing migration back and keeps the version', () => {
    const db = openDatabase(':memory:')
    const bad = m(LATEST + 1, 'CREATE TABLE half (id INTEGER); THIS IS NOT SQL;')
    expect(() => migrate(db, [...MIGRATIONS, bad])).toThrow()
    expect(readPragma(db, 'user_version')).toBe(LATEST)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'half'").get()).toBeUndefined()
  })

  it('rejects unordered migrations', () => {
    const db = openDatabase(':memory:')
    expect(() => migrate(db, [m(2, 'SELECT 1'), m(2, 'SELECT 1')])).toThrow(/ordered/)
  })
})

describe('migration 018: agent default model', () => {
  it('moves agents off the deprecated ACP package and starts them on Sonnet, whatever program starts them', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, MIGRATIONS.filter((x) => x.version < 18))
    // The person's own setup: Claude Code started by bunx, plus an agent that has nothing to do with Claude.
    db.exec("UPDATE agents SET command = 'bunx' WHERE id = 1")
    db.exec("INSERT INTO agents (name, command) VALUES ('Gemini CLI', 'gemini')")
    db.exec("INSERT INTO agent_args (agent_id, position, value) VALUES (2, 0, '--experimental-acp')")

    migrate(db)

    expect(db.prepare('SELECT name, command, default_model_id FROM agents ORDER BY id').all()).toEqual([
      { name: 'Claude Code', command: 'bunx', default_model_id: 'sonnet' },
      { name: 'Gemini CLI', command: 'gemini', default_model_id: null }
    ])
    expect(db.prepare('SELECT agent_id, value FROM agent_args ORDER BY agent_id, position').all()).toEqual([
      { agent_id: 1, value: '-y' },
      { agent_id: 1, value: '@agentclientprotocol/claude-agent-acp' },
      { agent_id: 2, value: '--experimental-acp' }
    ])
  })
})
