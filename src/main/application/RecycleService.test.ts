import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { SqliteRecycledChangeRepository } from '../infrastructure/db/sqlite-recycled-change-repository'
import { ChangeReverter } from './ChangeReverter'
import { FileChangeRecorder } from './FileChangeRecorder'
import { RecycleService } from './RecycleService'
import { SessionFiles } from './SessionFiles'
import { createVfsFixture } from './test-helpers'

let root: string
let f: Awaited<ReturnType<typeof createVfsFixture>>
let desktopId: number
let sessionId: number
let recycled: SqliteRecycledChangeRepository
let reverter: ChangeReverter
let service: RecycleService
let agentFiles: SessionFiles

const read = (name: string): Promise<string> => readFile(join(root, name), 'utf8')
const exists = (name: string): Promise<boolean> => stat(join(root, name)).then(() => true, () => false)
const changeOf = (vpath: string) => f.repos.changes.list(sessionId).find((c) => c.path === vpath)
/** What the agent does: ACP writes with the real absolute path of a file in the project. */
const agentWrite = (name: string, text: string): Promise<void> => agentFiles.forSession(sessionId).forSession('').writeTextFile(join(root, name), text)

beforeEach(async () => {
  f = await createVfsFixture()
  root = await realpath(f.projectDir)
  desktopId = f.desktop.id
  sessionId = f.repos.sessions.create({ agentId: f.agentId, desktopId, cwd: 'E:\\', title: 'chat' }).id
  recycled = new SqliteRecycledChangeRepository(f.db)
  const recorder = new FileChangeRecorder(f.repos.changes, f.publisher)
  agentFiles = new SessionFiles({ vfs: f.vfs, host: f.host, sessions: f.repos.sessions, recorder })
  reverter = new ChangeReverter(f.repos.changes, f.repos.sessions, f.vfs, f.host, recorder, recycled, f.publisher)
  service = new RecycleService(recycled, f.repos.sessions, f.vfs, f.host, recorder, f.publisher)
})

describe('reverting a change fills the Recycle Bin', () => {
  it('moves what the agent wrote to the bin and puts the original back', async () => {
    await writeFile(join(root, 'a.txt'), 'v1')
    await agentWrite('a.txt', 'v2')
    await reverter.revert(changeOf('E:\\a.txt')!.id)

    expect(await read('a.txt')).toBe('v1')
    expect(changeOf('E:\\a.txt')).toBeUndefined()
    expect(service.list(desktopId)).toMatchObject([{ path: 'E:\\a.txt', revertedText: 'v2', restoredText: 'v1', sessionId, desktopId }])
    expect(f.publisher.payloads('recycle.changed')).toEqual([{ desktopId }])
  })

  it('records a reverted added file (deleted again) with no restored text', async () => {
    await agentWrite('new.txt', 'hello')
    await reverter.revert(changeOf('E:\\new.txt')!.id)
    expect(await exists('new.txt')).toBe(false)
    expect(service.list(desktopId)[0]).toMatchObject({ path: 'E:\\new.txt', revertedText: 'hello', restoredText: null })
  })

  it('reverts changes on C: too (the system disk of the desktop)', async () => {
    const home = join(f.desktopsDir, String(desktopId), 'C', 'Users', 'Agent', 'notes.md')
    await agentFiles.forSession(sessionId).forSession('').writeTextFile(home, 'draft')
    const change = changeOf('C:\\Users\\Agent\\notes.md')!
    expect(change.kind).toBe('added')
    await reverter.revert(change.id)
    expect(await stat(home).then(() => true, () => false)).toBe(false)
    expect(service.list(desktopId)[0]!.path).toBe('C:\\Users\\Agent\\notes.md')
  })

  it('leaves the bin alone when the revert fails', async () => {
    await agentWrite('x.txt', 'a')
    const id = changeOf('E:\\x.txt')!.id
    f.repos.changes.remove(id)
    await expect(reverter.revert(id)).rejects.toThrow(/not found/)
    expect(service.list(desktopId)).toEqual([])
  })

  it('cannot revert while the change\'s drive is ejected, and works again after plugging the project back in', async () => {
    await writeFile(join(root, 'a.txt'), 'v1')
    await agentWrite('a.txt', 'v2')
    const change = changeOf('E:\\a.txt')!
    f.drives.eject(desktopId, 'E')
    expect(f.repos.changes.list(sessionId)[0]!.path).toBe('?:\\a.txt')
    await expect(reverter.revert(change.id)).rejects.toThrow(/not plugged in/)
    expect(await read('a.txt')).toBe('v2')

    f.drives.plugInFolder(desktopId, f.folder.id)
    await reverter.revert(change.id)
    expect(await read('a.txt')).toBe('v1')
  })
})

describe('RecycleService.restore', () => {
  it('writes the reverted text back, records it as a new change of the chat and empties the row', async () => {
    await writeFile(join(root, 'a.txt'), 'v1')
    await agentWrite('a.txt', 'v2')
    await reverter.revert(changeOf('E:\\a.txt')!.id)
    const item = service.list(desktopId)[0]!
    f.publisher.published.length = 0

    await service.restore(item.id)

    expect(await read('a.txt')).toBe('v2')
    expect(changeOf('E:\\a.txt')).toMatchObject({ kind: 'modified', originalText: 'v1', currentText: 'v2' })
    expect(service.list(desktopId)).toEqual([])
    expect(f.publisher.names()).toEqual(expect.arrayContaining(['changes.changed', 'recycle.changed']))
  })

  it('recreates an added file and deletes a file the agent had deleted', async () => {
    await agentWrite('new.txt', 'hello')
    await reverter.revert(changeOf('E:\\new.txt')!.id)
    await service.restore(service.list(desktopId)[0]!.id)
    expect(await read('new.txt')).toBe('hello')
    expect(changeOf('E:\\new.txt')).toMatchObject({ kind: 'added' })

    await writeFile(join(root, 'gone.txt'), 'bye')
    const added = recycled.add({ desktopId, sessionId, folderId: f.folder.id, path: 'gone.txt', revertedText: null, restoredText: 'bye' })
    await service.restore(added.id)
    expect(await exists('gone.txt')).toBe(false)
    expect(changeOf('E:\\gone.txt')).toMatchObject({ kind: 'deleted', originalText: 'bye', currentText: null })
  })

  it('still restores when the chat is gone, without recording a change', async () => {
    const item = recycled.add({ desktopId, sessionId, folderId: f.folder.id, path: 'orphan.txt', revertedText: 'text', restoredText: null })
    f.repos.sessions.remove(sessionId)
    await service.restore(item.id)
    expect(await read('orphan.txt')).toBe('text')
  })

  it('refuses unknown items, paths outside the drive and ejected drives', async () => {
    await expect(service.restore(404)).rejects.toThrow(/not found/)
    const evil = recycled.add({ desktopId, sessionId: null, folderId: f.folder.id, path: '../escape.txt', revertedText: 'x', restoredText: null })
    await expect(service.restore(evil.id)).rejects.toThrow(/outside the workspace/)
    f.drives.eject(desktopId, 'E')
    await expect(service.restore(evil.id)).rejects.toThrow(/not plugged in/)
    expect(service.list(desktopId)).toHaveLength(1)
  })
})

describe('RecycleService.remove / empty', () => {
  it('deletes one item or all items and tells the window', () => {
    const a = recycled.add({ desktopId, sessionId, folderId: null, path: 'a', revertedText: 'x', restoredText: null })
    recycled.add({ desktopId, sessionId, folderId: null, path: 'b', revertedText: 'x', restoredText: null })
    service.remove(a.id)
    expect(service.list(desktopId).map((i) => i.path)).toEqual(['C:\\b'])
    service.empty(desktopId)
    expect(service.list(desktopId)).toEqual([])
    expect(f.publisher.payloads('recycle.changed')).toEqual([{ desktopId }, { desktopId }])
    expect(() => service.remove(a.id)).toThrow(/not found/)
  })
})
