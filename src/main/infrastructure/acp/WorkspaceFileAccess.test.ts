import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PathOutsideSandboxError, WorkspaceFileAccess } from './WorkspaceFileAccess'

let root: string
let outside: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'a7-ws-'))
  outside = await mkdtemp(join(tmpdir(), 'a7-out-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  await rm(outside, { recursive: true, force: true })
})

describe('WorkspaceFileAccess', () => {
  it('reads files, with line and limit', async () => {
    await writeFile(join(root, 'a.txt'), 'one\ntwo\nthree\nfour')
    const files = new WorkspaceFileAccess(root)
    expect(await files.readTextFile(join(root, 'a.txt'))).toBe('one\ntwo\nthree\nfour')
    expect(await files.readTextFile('a.txt', 2, 2)).toBe('two\nthree')
  })

  it('writes files, creates folders and reports before/after', async () => {
    const onWrite = vi.fn()
    const files = new WorkspaceFileAccess(root, onWrite)
    await files.writeTextFile('sub/dir/new.txt', 'v1')
    await files.writeTextFile('sub/dir/new.txt', 'v2')
    expect(await readFile(join(root, 'sub/dir/new.txt'), 'utf8')).toBe('v2')
    expect(onWrite).toHaveBeenNthCalledWith(1, join(root, 'sub/dir/new.txt'), null, 'v1')
    expect(onWrite).toHaveBeenNthCalledWith(2, join(root, 'sub/dir/new.txt'), 'v1', 'v2')
  })

  it('rejects path traversal and absolute paths outside the root', async () => {
    const files = new WorkspaceFileAccess(root)
    await expect(files.readTextFile('../etc/passwd')).rejects.toBeInstanceOf(PathOutsideSandboxError)
    await expect(files.writeTextFile('../evil.txt', 'x')).rejects.toBeInstanceOf(PathOutsideSandboxError)
    await expect(files.readTextFile(join(outside, 'x.txt'))).rejects.toBeInstanceOf(PathOutsideSandboxError)
    await expect(files.writeTextFile(root + '-sibling/x.txt', 'x')).rejects.toBeInstanceOf(PathOutsideSandboxError)
  })

  it('rejects symlinks that escape the root', async () => {
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await mkdir(join(root, 'dir'))
    await symlink(outside, join(root, 'dir', 'link'))
    const files = new WorkspaceFileAccess(root)
    await expect(files.readTextFile('dir/link/secret.txt')).rejects.toBeInstanceOf(PathOutsideSandboxError)
    await expect(files.writeTextFile('dir/link/new.txt', 'x')).rejects.toBeInstanceOf(PathOutsideSandboxError)
  })
})
