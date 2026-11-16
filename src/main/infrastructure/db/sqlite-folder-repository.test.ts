import { describe, expect, it } from 'vitest'
import { openDatabase } from './open-database'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteDriveRepository } from './sqlite-drive-repository'
import { SqliteFileChangeRepository } from './sqlite-file-change-repository'
import { SqliteFolderRepository } from './sqlite-folder-repository'
import { count, createFixture } from './test-helpers'

describe('SqliteFolderRepository', () => {
  const make = () => new SqliteFolderRepository(openDatabase(':memory:'))

  it('adds folders idempotently by path', () => {
    const repo = make()
    const a = repo.add('/a', 'a')
    const again = repo.add('/a', 'renamed')
    expect(again).toEqual(a)
    expect(a).toEqual({ id: a.id, name: 'a', path: '/a', lastOpenedAt: null })
    expect(repo.list()).toHaveLength(1)
  })

  it('finds by id and path', () => {
    const repo = make()
    const a = repo.add('/a', 'a')
    expect(repo.get(a.id)).toEqual(a)
    expect(repo.getByPath('/a')).toEqual(a)
    expect(repo.get(99)).toBeNull()
    expect(repo.getByPath('/nope')).toBeNull()
  })

  it('touch stamps an ISO timestamp and orders recent first', () => {
    const repo = make()
    const a = repo.add('/a', 'alpha')
    const b = repo.add('/b', 'beta')
    repo.touch(b.id)
    const list = repo.list()
    expect(list.map((f) => f.id)).toEqual([b.id, a.id])
    expect(list[0].lastOpenedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('removes folders, unplugging them from desktops and dropping their recorded changes; chats survive', () => {
    const f = createFixture()
    const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: false })
    new SqliteDriveRepository(f.db).add(desktop.id, 'E', f.folderId)
    new SqliteFileChangeRepository(f.db).record({ sessionId: f.sessionId, folderId: f.folderId, path: 'a.ts', previousText: null, newText: 'x' })
    const repo = new SqliteFolderRepository(f.db)
    expect(repo.remove(f.folderId)).toBe(true)
    expect(repo.remove(f.folderId)).toBe(false)
    expect(count(f.db, 'desktop_drives')).toBe(0)
    expect(count(f.db, 'file_changes')).toBe(0)
    expect(count(f.db, 'sessions')).toBe(1)
  })
})
