import { describe, expect, it } from 'vitest'
import { SqliteFileChangeRepository } from './sqlite-file-change-repository'
import { count, createFixture, createSession } from './test-helpers'

describe('SqliteFileChangeRepository', () => {
  it('records a modification with line counts', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    const c = repo.record({ sessionId: f.sessionId, path: 'a.ts', previousText: 'a\nb\nc\n', newText: 'a\nB\nc\nd\n' })!
    expect(c).toMatchObject({
      sessionId: f.sessionId,
      path: 'a.ts',
      kind: 'modified',
      additions: 2,
      deletions: 1,
      originalText: 'a\nb\nc\n',
      currentText: 'a\nB\nc\nd\n'
    })
  })

  it('classifies new files as added and deletions as deleted', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    expect(repo.record({ sessionId: f.sessionId, path: 'new.ts', previousText: null, newText: 'x\ny' })).toMatchObject({
      kind: 'added',
      additions: 2,
      deletions: 0,
      originalText: null
    })
    expect(repo.record({ sessionId: f.sessionId, path: 'old.ts', previousText: 'x\ny\nz', newText: null })).toMatchObject({
      kind: 'deleted',
      additions: 0,
      deletions: 3,
      currentText: null
    })
  })

  it('keeps the first original and the latest text across writes', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    const first = repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'one\ntwo', newText: 'one\n2' })!
    const second = repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'one\n2', newText: 'one\n2\nthree' })!
    expect(second.id).toBe(first.id)
    expect(second).toMatchObject({ originalText: 'one\ntwo', currentText: 'one\n2\nthree', additions: 2, deletions: 1 })
    expect(repo.list(f.sessionId)).toHaveLength(1)
  })

  it('turns an added file that is later deleted into nothing, and a reverted edit too', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    repo.record({ sessionId: f.sessionId, path: 'tmp', previousText: null, newText: 'x' })
    expect(repo.record({ sessionId: f.sessionId, path: 'tmp', previousText: 'x', newText: null })).toBeNull()
    repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'a', newText: 'b' })
    expect(repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'b', newText: 'a' })).toBeNull()
    expect(repo.list(f.sessionId)).toEqual([])
  })

  it('ignores writes that do not change a fresh file', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    expect(repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'same', newText: 'same' })).toBeNull()
    expect(count(f.db, 'file_changes')).toBe(0)
  })

  it('reclassifies a modified file that is deleted and a deleted file that is recreated', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'x', newText: 'y' })
    expect(repo.record({ sessionId: f.sessionId, path: 'a', previousText: 'y', newText: null })).toMatchObject({ kind: 'deleted', deletions: 1 })
    expect(repo.record({ sessionId: f.sessionId, path: 'a', previousText: null, newText: 'z' })).toMatchObject({
      kind: 'modified',
      additions: 1,
      deletions: 1
    })
  })

  it('isolates sessions, orders by path, gets and removes', () => {
    const f = createFixture()
    const other = createSession(f.db, f.folderId, f.agentId)
    const repo = new SqliteFileChangeRepository(f.db)
    const b = repo.record({ sessionId: f.sessionId, path: 'b', previousText: null, newText: '1' })!
    repo.record({ sessionId: f.sessionId, path: 'a', previousText: null, newText: '1' })
    repo.record({ sessionId: other, path: 'a', previousText: null, newText: '1' })
    expect(repo.list(f.sessionId).map((c) => c.path)).toEqual(['a', 'b'])
    expect(repo.get(b.id)).toEqual(b)
    expect(repo.remove(b.id)).toBe(true)
    expect(repo.remove(b.id)).toBe(false)
    expect(repo.get(b.id)).toBeNull()
    expect(repo.list(other)).toHaveLength(1)
  })

  it('cascades with the session', () => {
    const f = createFixture()
    new SqliteFileChangeRepository(f.db).record({ sessionId: f.sessionId, path: 'a', previousText: null, newText: '1' })
    f.db.prepare('DELETE FROM sessions').run()
    expect(count(f.db, 'file_changes')).toBe(0)
  })
})
