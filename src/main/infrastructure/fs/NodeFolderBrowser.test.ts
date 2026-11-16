import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeFolderBrowser, parseHead } from './NodeFolderBrowser'

describe('gitBranch', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'a7-git-'))
  })
  afterEach(() => rm(root, { recursive: true, force: true }))

  it('reads the branch from .git/HEAD', async () => {
    await mkdir(join(root, '.git'))
    await writeFile(join(root, '.git', 'HEAD'), 'ref: refs/heads/feature/x\n')
    expect(await new NodeFolderBrowser().gitBranch(root)).toBe('feature/x')
  })

  it('is null outside a repository', async () => {
    expect(await new NodeFolderBrowser().gitBranch(root)).toBeNull()
  })

  it('shortens a detached HEAD', () => {
    expect(parseHead('0123456789abcdef0123456789abcdef01234567\n')).toBe('0123456')
  })
})
