import { mkdtemp, readFile, realpath, rm, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteDesktopRepository } from '../infrastructure/db/sqlite-desktop-repository'
import { SqliteRecycledChangeRepository } from '../infrastructure/db/sqlite-recycled-change-repository'
import { NodeWorkspaceFileSystem } from '../infrastructure/fs/NodeWorkspaceFileSystem'
import { ChangeReverter } from './ChangeReverter'
import { FileChangeRecorder } from './FileChangeRecorder'
import { RecycleService } from './RecycleService'
import { WorkspaceFiles } from './WorkspaceFiles'
import { createAppFixture } from './test-helpers'

let root: string
let f: ReturnType<typeof createAppFixture>
let desktopId: number
let sessionId: number
let recycled: SqliteRecycledChangeRepository
let reverter: ChangeReverter
let service: RecycleService
let agentFiles: ReturnType<WorkspaceFiles['forSession']>

const read = (name: string): Promise<string> => readFile(join(root, name), 'utf8')
const exists = (name: string): Promise<boolean> => stat(join(root, name)).then(() => true, () => false)
const changeOf = (path: string) => f.repos.changes.list(sessionId).find((c) => c.path === path)

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'a7-recycle-')))
  f = createAppFixture()
  const folder = f.repos.folders.add(root, 'tmp')
  const desktops = new SqliteDesktopRepository(f.db)
  desktopId = desktops.create({ folderId: folder.id, agentId: f.agentId, title: 'tmp', isOpen: true }).id
  sessionId = f.repos.sessions.create({ folderId: folder.id, agentId: f.agentId, desktopId, title: 'chat' }).id
  recycled = new SqliteRecycledChangeRepository(f.db)
  const fileSystem = new NodeWorkspaceFileSystem()
  const recorder = new FileChangeRecorder(f.repos.changes, f.publisher)
  agentFiles = new WorkspaceFiles(fileSystem, recorder).forSession(sessionId, root)
  reverter = new ChangeReverter(f.repos.changes, f.repos.sessions, f.repos.folders, fileSystem, recorder, recycled, desktops, f.publisher)
  service = new RecycleService(recycled, desktops, f.repos.folders, f.repos.sessions, fileSystem, recorder, f.publisher)
})
afterEach(() => rm(root, { recursive: true, force: true }))

const agentWrite = (path: string, text: string): Promise<void> => agentFiles.forSession('').writeTextFile(path, text)

describe('reverting a change fills the Recycle Bin', () => {
  it('moves what the agent wrote to the bin and puts the original back', async () => {
    await writeFile(join(root, 'a.txt'), 'v1')
    await agentWrite('a.txt', 'v2')
    await reverter.revert(changeOf('a.txt')!.id)

    expect(await read('a.txt')).toBe('v1')
    expect(changeOf('a.txt')).toBeUndefined()
    expect(service.list(desktopId)).toMatchObject([{ path: 'a.txt', revertedText: 'v2', restoredText: 'v1', sessionId, desktopId }])
    expect(f.publisher.payloads('recycle.changed')).toEqual([{ desktopId }])
  })

  it('records a reverted added file (deleted again) with no restored text', async () => {
    await agentWrite('new.txt', 'hello')
    await reverter.revert(changeOf('new.txt')!.id)
    expect(await exists('new.txt')).toBe(false)
    expect(service.list(desktopId)[0]).toMatchObject({ path: 'new.txt', revertedText: 'hello', restoredText: null })
  })

  it('leaves the bin alone when the revert fails', async () => {
    await agentWrite('x.txt', 'a')
    const id = changeOf('x.txt')!.id
    f.repos.changes.remove(id)
    await expect(reverter.revert(id)).rejects.toThrow(/not found/)
    expect(service.list(desktopId)).toEqual([])
  })
})

describe('RecycleService.restore', () => {
  it('writes the reverted text back, records it as a new change of the chat and empties the row', async () => {
    await writeFile(join(root, 'a.txt'), 'v1')
    await agentWrite('a.txt', 'v2')
    await reverter.revert(changeOf('a.txt')!.id)
    const item = service.list(desktopId)[0]!
    f.publisher.published.length = 0

    await service.restore(item.id)

    expect(await read('a.txt')).toBe('v2')
    expect(changeOf('a.txt')).toMatchObject({ kind: 'modified', originalText: 'v1', currentText: 'v2' })
    expect(service.list(desktopId)).toEqual([])
    expect(f.publisher.names()).toEqual(expect.arrayContaining(['changes.changed', 'recycle.changed']))
  })

  it('recreates an added file and deletes a file the agent had deleted', async () => {
    await agentWrite('new.txt', 'hello')
    await reverter.revert(changeOf('new.txt')!.id)
    await service.restore(service.list(desktopId)[0]!.id)
    expect(await read('new.txt')).toBe('hello')
    expect(changeOf('new.txt')).toMatchObject({ kind: 'added' })

    await writeFile(join(root, 'gone.txt'), 'bye')
    const added = recycled.add({ desktopId, sessionId, path: 'gone.txt', revertedText: null, restoredText: 'bye' })
    await service.restore(added.id)
    expect(await exists('gone.txt')).toBe(false)
    expect(changeOf('gone.txt')).toMatchObject({ kind: 'deleted', originalText: 'bye', currentText: null })
  })

  it('still restores when the chat is gone, without recording a change', async () => {
    const item = recycled.add({ desktopId, sessionId, path: 'orphan.txt', revertedText: 'text', restoredText: null })
    f.repos.sessions.remove(sessionId)
    await service.restore(item.id)
    expect(await read('orphan.txt')).toBe('text')
  })

  it('refuses unknown items and paths outside the workspace', async () => {
    await expect(service.restore(404)).rejects.toThrow(/not found/)
    const evil = recycled.add({ desktopId, sessionId: null, path: '../escape.txt', revertedText: 'x', restoredText: null })
    await expect(service.restore(evil.id)).rejects.toThrow(/outside the workspace/)
    expect(service.list(desktopId)).toHaveLength(1)
  })
})

describe('RecycleService.remove / empty', () => {
  it('deletes one item or all items and tells the window', () => {
    const a = recycled.add({ desktopId, sessionId, path: 'a', revertedText: 'x', restoredText: null })
    recycled.add({ desktopId, sessionId, path: 'b', revertedText: 'x', restoredText: null })
    service.remove(a.id)
    expect(service.list(desktopId).map((i) => i.path)).toEqual(['b'])
    service.empty(desktopId)
    expect(service.list(desktopId)).toEqual([])
    expect(f.publisher.payloads('recycle.changed')).toEqual([{ desktopId }, { desktopId }])
    expect(() => service.remove(a.id)).toThrow(/not found/)
  })
})
