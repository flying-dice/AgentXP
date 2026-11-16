import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from './open-database'
import { SqliteAgentRepository } from './sqlite-agent-repository'
import { count, createFixture } from './test-helpers'

describe('SqliteAgentRepository', () => {
  let repo: SqliteAgentRepository
  beforeEach(() => {
    repo = new SqliteAgentRepository(openDatabase(':memory:'))
  })

  it('returns the seeded default agent', () => {
    expect(repo.getDefault()).toEqual({
      id: 1,
      name: 'Claude Code',
      command: 'npx',
      args: ['-y', '@zed-industries/claude-code-acp'],
      env: {},
      isDefault: true,
      defaultModeId: null
    })
    expect(repo.list()).toHaveLength(1)
  })

  it('creates agents with ordered args and env', () => {
    const a = repo.create({ name: 'Gemini', command: 'gemini', args: ['--acp', '-x', 'b'], env: { KEY: 'v', A: '1' } })
    expect(a.isDefault).toBe(false)
    expect(a.args).toEqual(['--acp', '-x', 'b'])
    expect(a.env).toEqual({ A: '1', KEY: 'v' })
    expect(repo.get(a.id)).toEqual(a)
    expect(repo.get(999)).toBeNull()
  })

  it('rejects duplicate names', () => {
    expect(() => repo.create({ name: 'Claude Code', command: 'x', args: [], env: {} })).toThrow()
  })

  it('updates fields and replaces args/env', () => {
    const a = repo.create({ name: 'A', command: 'a', args: ['1', '2'], env: { X: '1' } })
    const updated = repo.update(a.id, { name: 'B', command: 'b', args: ['9'], env: { Y: '2' } })
    expect(updated).toMatchObject({ name: 'B', command: 'b', args: ['9'], env: { Y: '2' } })
    expect(repo.update(999, { name: 'n', command: 'c', args: [], env: {} })).toBeNull()
  })

  it('keeps at most one default and switches atomically', () => {
    const a = repo.create({ name: 'A', command: 'a', args: [], env: {} })
    expect(repo.setDefault(a.id)).toBe(true)
    expect(repo.list().filter((x) => x.isDefault).map((x) => x.id)).toEqual([a.id])
    expect(repo.getDefault()?.id).toBe(a.id)
    expect(repo.setDefault(999)).toBe(false)
    expect(repo.getDefault()?.id).toBe(a.id)
  })

  it('enforces the single default with a partial unique index', () => {
    const db = openDatabase(':memory:')
    expect(() => db.prepare("INSERT INTO agents (name, command, is_default) VALUES ('X','x',1)").run()).toThrow(/UNIQUE/)
  })

  it('cascades args and env on delete', () => {
    const db = openDatabase(':memory:')
    const r = new SqliteAgentRepository(db)
    const a = r.create({ name: 'A', command: 'a', args: ['1'], env: { K: 'v' } })
    expect(r.remove(a.id)).toBe(true)
    expect(r.remove(a.id)).toBe(false)
    expect(count(db, 'agent_env')).toBe(0)
    expect(count(db, 'agent_args')).toBe(2) // only the seeded agent's
  })

  it('refuses to delete an agent that sessions reference', () => {
    const f = createFixture()
    expect(() => new SqliteAgentRepository(f.db).remove(f.agentId)).toThrow(/FOREIGN KEY/)
  })

  it('stores, changes and clears the default session mode', () => {
    const created = repo.create({ name: 'A', command: 'a', args: [], env: {}, defaultModeId: 'acceptEdits' })
    expect(repo.get(created.id)?.defaultModeId).toBe('acceptEdits')
    expect(repo.update(created.id, { name: 'A', command: 'a', args: [], env: {}, defaultModeId: 'plan' })?.defaultModeId).toBe('plan')
    expect(repo.update(created.id, { name: 'A', command: 'a', args: [], env: {} })?.defaultModeId).toBeNull()
  })
})
