import { describe, expect, it } from 'vitest'
import { SqliteTaskRepository } from './sqlite-task-repository'
import { createFixture, createSession } from './test-helpers'

describe('SqliteTaskRepository', () => {
  it('replaces the plan atomically keeping order', () => {
    const f = createFixture()
    const repo = new SqliteTaskRepository(f.db)
    const first = repo.replace(f.sessionId, [
      { content: 'one', priority: 'high', status: 'in_progress' },
      { content: 'two', priority: 'low', status: 'pending' }
    ])
    expect(first.map((t) => [t.position, t.content, t.status])).toEqual([
      [0, 'one', 'in_progress'],
      [1, 'two', 'pending']
    ])
    expect(first[0].sessionId).toBe(f.sessionId)

    const second = repo.replace(f.sessionId, [{ content: 'three', priority: 'medium', status: 'completed' }])
    expect(second).toHaveLength(1)
    expect(repo.list(f.sessionId)).toEqual(second)
  })

  it('leaves the old plan untouched when the new one is invalid', () => {
    const f = createFixture()
    const repo = new SqliteTaskRepository(f.db)
    repo.replace(f.sessionId, [{ content: 'keep', priority: 'high', status: 'pending' }])
    expect(() =>
      repo.replace(f.sessionId, [
        { content: 'ok', priority: 'high', status: 'pending' },
        // @ts-expect-error invalid on purpose to trigger the CHECK constraint
        { content: 'bad', priority: 'urgent', status: 'pending' }
      ])
    ).toThrow(/CHECK/)
    expect(repo.list(f.sessionId).map((t) => t.content)).toEqual(['keep'])
  })

  it('clears with an empty plan and isolates sessions', () => {
    const f = createFixture()
    const other = createSession(f.db, f.folderId, f.agentId)
    const repo = new SqliteTaskRepository(f.db)
    repo.replace(f.sessionId, [{ content: 'a', priority: 'low', status: 'pending' }])
    repo.replace(other, [{ content: 'b', priority: 'low', status: 'pending' }])
    expect(repo.replace(f.sessionId, [])).toEqual([])
    expect(repo.list(other)).toHaveLength(1)
  })
})
