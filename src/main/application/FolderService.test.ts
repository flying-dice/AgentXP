import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeFolderBrowser } from '../infrastructure/fs/NodeFolderBrowser'
import { NodeWorkspaceFileSystem } from '../infrastructure/fs/NodeWorkspaceFileSystem'
import { FolderService } from './FolderService'
import { createAppFixture } from './test-helpers'

let root: string
let f: ReturnType<typeof createAppFixture>
let service: FolderService
let folderId: number

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'a7-folder-')))
  f = createAppFixture()
  folderId = f.repos.folders.add(root, 'tmp').id
  service = new FolderService(f.repos.folders, new NodeFolderBrowser(), { pickFolder: async () => null }, f.publisher, new NodeWorkspaceFileSystem())
})
afterEach(() => rm(root, { recursive: true, force: true }))

describe('FolderService.writeFile', () => {
  it('writes (and creates) a text file inside the folder and reads it back', async () => {
    await service.writeFile(folderId, 'docs/new.md', '# Title')
    expect(await readFile(join(root, 'docs', 'new.md'), 'utf8')).toBe('# Title')
    await service.writeFile(folderId, 'docs/new.md', 'changed')
    expect(await service.readFile(folderId, 'docs/new.md')).toBe('changed')
  })

  it('refuses paths that leave the folder and unknown folders', async () => {
    await expect(service.writeFile(folderId, '../escape.txt', 'x')).rejects.toThrow(/outside the workspace/)
    await expect(service.writeFile(folderId, join(tmpdir(), 'abs.txt'), 'x')).rejects.toThrow(/outside the workspace/)
    await expect(service.writeFile(999, 'a.txt', 'x')).rejects.toThrow(/not found/)
  })

  it('is not recorded as an agent change', async () => {
    await service.writeFile(folderId, 'a.txt', 'x')
    expect(f.publisher.names()).not.toContain('changes.changed')
  })
})
