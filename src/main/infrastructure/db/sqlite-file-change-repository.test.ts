import { describe, expect, it } from 'vitest'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteDriveRepository } from './sqlite-drive-repository'
import { SqliteFileChangeRepository } from './sqlite-file-change-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { count, createFixture, createSession } from './test-helpers'

describe('SqliteFileChangeRepository', () => {
  it('records a modification with line counts', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    const c = repo.record({ sessionId: f.sessionId, folderId: null, path: 'a.ts', previousText: 'a\nb\nc\n', newText: 'a\nB\nc\nd\n' })!
    expect(c).toMatchObject({
      sessionId: f.sessionId,
      path: 'C:\\a.ts',
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
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'new.ts', previousText: null, newText: 'x\ny' })).toMatchObject({
      kind: 'added',
      additions: 2,
      deletions: 0,
      originalText: null
    })
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'old.ts', previousText: 'x\ny\nz', newText: null })).toMatchObject({
      kind: 'deleted',
      additions: 0,
      deletions: 3,
      currentText: null
    })
  })

  it('keeps the first original and the latest text across writes', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    const first = repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'one\ntwo', newText: 'one\n2' })!
    const second = repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'one\n2', newText: 'one\n2\nthree' })!
    expect(second.id).toBe(first.id)
    expect(second).toMatchObject({ originalText: 'one\ntwo', currentText: 'one\n2\nthree', additions: 2, deletions: 1 })
    expect(repo.list(f.sessionId)).toHaveLength(1)
  })

  it('turns an added file that is later deleted into nothing, and a reverted edit too', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    repo.record({ sessionId: f.sessionId, folderId: null, path: 'tmp', previousText: null, newText: 'x' })
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'tmp', previousText: 'x', newText: null })).toBeNull()
    repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'a', newText: 'b' })
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'b', newText: 'a' })).toBeNull()
    expect(repo.list(f.sessionId)).toEqual([])
  })

  it('ignores writes that do not change a fresh file', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'same', newText: 'same' })).toBeNull()
    expect(count(f.db, 'file_changes')).toBe(0)
  })

  it('reclassifies a modified file that is deleted and a deleted file that is recreated', () => {
    const f = createFixture()
    const repo = new SqliteFileChangeRepository(f.db)
    repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'x', newText: 'y' })
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: 'y', newText: null })).toMatchObject({ kind: 'deleted', deletions: 1 })
    expect(repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: null, newText: 'z' })).toMatchObject({
      kind: 'modified',
      additions: 1,
      deletions: 1
    })
  })

  it('isolates sessions, orders by path, gets and removes', () => {
    const f = createFixture()
    const other = createSession(f.db, f.folderId, f.agentId)
    const repo = new SqliteFileChangeRepository(f.db)
    const b = repo.record({ sessionId: f.sessionId, folderId: null, path: 'b', previousText: null, newText: '1' })!
    repo.record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: null, newText: '1' })
    repo.record({ sessionId: other, folderId: null, path: 'a', previousText: null, newText: '1' })
    expect(repo.list(f.sessionId).map((c) => c.path)).toEqual(['C:\\a', 'C:\\b'])
    expect(repo.get(b.id)).toEqual(b)
    expect(repo.remove(b.id)).toBe(true)
    expect(repo.remove(b.id)).toBe(false)
    expect(repo.get(b.id)).toBeNull()
    expect(repo.list(other)).toHaveLength(1)
  })

  it('cascades with the session', () => {
    const f = createFixture()
    new SqliteFileChangeRepository(f.db).record({ sessionId: f.sessionId, folderId: null, path: 'a', previousText: null, newText: '1' })
    f.db.prepare('DELETE FROM sessions').run()
    expect(count(f.db, 'file_changes')).toBe(0)
  })

  it('locates a file by folder and path and shows it under the letter the desktop plugged the folder in as', () => {
    const f = createFixture()
    const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: false })
    const session = new SqliteSessionRepository(f.db).create({ agentId: f.agentId, desktopId: desktop.id, title: 's' }).id
    const drives = new SqliteDriveRepository(f.db)
    const repo = new SqliteFileChangeRepository(f.db)
    repo.record({ sessionId: session, folderId: null, path: 'a.ts', previousText: null, newText: '1' })
    const onProject = repo.record({ sessionId: session, folderId: f.folderId, path: 'src/a.ts', previousText: null, newText: '2' })!
    expect(onProject.path).toBe('?:\\src\\a.ts') // not plugged in yet

    drives.add(desktop.id, 'F', f.folderId)
    expect(repo.list(session).map((c) => c.path).sort()).toEqual(['C:\\a.ts', 'F:\\src\\a.ts'])
    expect(repo.get(onProject.id)).toMatchObject({ folderId: f.folderId, relativePath: 'src/a.ts', path: 'F:\\src\\a.ts' })

    // The same relative path on C: and on the project are two changes.
    expect(repo.list(session)).toHaveLength(2)
    drives.remove(desktop.id, 'F')
    expect(repo.get(onProject.id)?.path).toBe('?:\\src\\a.ts')
  })
})
