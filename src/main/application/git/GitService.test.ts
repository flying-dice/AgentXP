import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ExecGitCli } from '../../infrastructure/git/ExecGitCli'
import { RecordingPublisher, createVfsFixture } from '../test-helpers'
import { GitService } from './GitService'

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' })

let f: Awaited<ReturnType<typeof createVfsFixture>>
let id: number
let service: GitService
let events: RecordingPublisher

const init = async (): Promise<void> => {
  git(f.projectDir, 'init', '-q', '-b', 'main')
  await mkdir(join(f.projectDir, 'src'), { recursive: true })
  await writeFile(join(f.projectDir, 'src', 'a.ts'), 'one\ntwo\nthree\nfour\nfive\n')
  await writeFile(join(f.projectDir, 'keep.txt'), 'keep\n')
  git(f.projectDir, 'add', '-A')
  git(f.projectDir, 'commit', '-q', '-m', 'init')
}

beforeEach(async () => {
  f = await createVfsFixture()
  id = f.desktop.id
  events = new RecordingPublisher()
  service = new GitService({ vfs: f.vfs, cli: new ExecGitCli(), events, codeDesktops: () => [id], debounceMs: 5, pollMs: 0 })
})

describe('not a repository', () => {
  it('answers null / empty / nothing', async () => {
    await writeFile(join(f.projectDir, 'a.txt'), 'x\n')
    expect(await service.status(id, 'E:\\')).toBeNull()
    expect(await service.lineChanges(id, 'E:\\a.txt')).toEqual([])
    expect(await service.headText(id, 'E:\\a.txt')).toBeNull()
    expect(await service.status(id, 'Q:\\')).toBeNull()
  })

  it('init starts tracking the folder and tells the Code window', async () => {
    expect(await service.status(id, 'E:\\')).toBeNull()
    await service.init(id, 'E:\\')
    expect(await service.status(id, 'E:\\')).toMatchObject({ entries: [] })
    await service.init(id, 'E:\\') // already tracked: nothing happens
    await new Promise((r) => setTimeout(r, 30))
    expect(events.payloads('git.changed').length).toBeGreaterThan(0)
  })

  it('init says so when git is missing or the drive is gone', async () => {
    const missing = new GitService({ vfs: f.vfs, cli: new ExecGitCli({ command: 'git-does-not-exist' }), events, codeDesktops: () => [], pollMs: 0 })
    await expect(missing.init(id, 'E:\\')).rejects.toThrow('Git is not installed')
    await expect(service.init(id, 'Q:\\')).rejects.toThrow('not available')
  })

  it('degrades when git is missing', async () => {
    const missing = new GitService({ vfs: f.vfs, cli: new ExecGitCli({ command: 'git-does-not-exist' }), events, codeDesktops: () => [], pollMs: 0 })
    expect(await missing.status(id, 'E:\\')).toBeNull()
  })
})

describe('in a repository', () => {
  beforeEach(init)

  it('is clean after the commit and reports the branch', async () => {
    expect(await service.status(id, 'E:\\')).toEqual({ branch: 'main', ahead: 0, behind: 0, entries: [] })
  })

  it('reports modified, untracked, deleted and renamed files as VPaths', async () => {
    await writeFile(join(f.projectDir, 'src', 'a.ts'), 'one\nTWO\nthree\nfour\nfive\n')
    await writeFile(join(f.projectDir, 'new file.txt'), 'n\n')
    git(f.projectDir, 'mv', 'keep.txt', 'kept.txt')
    const status = await service.status(id, 'E:\\')
    const by = Object.fromEntries(status!.entries.map((e) => [e.path, e]))
    expect(by['E:\\src\\a.ts']).toMatchObject({ index: ' ', worktree: 'M' })
    expect(by['E:\\new file.txt']).toMatchObject({ index: '?', worktree: '?' })
    expect(by['E:\\kept.txt']).toMatchObject({ index: 'R', origPath: 'E:\\keep.txt' })
    await rm(join(f.projectDir, 'src', 'a.ts'))
    expect((await service.status(id, 'E:\\'))!.entries.find((e) => e.path === 'E:\\src\\a.ts')).toMatchObject({ worktree: 'D' })
  })

  it('maps paths of a sub folder root', async () => {
    await writeFile(join(f.projectDir, 'src', 'a.ts'), 'changed\n')
    await writeFile(join(f.projectDir, 'top.txt'), 't\n')
    const status = await service.status(id, 'E:\\src')
    expect(status!.entries.map((e) => e.path)).toEqual(['E:\\src\\a.ts'])
  })

  it('gives HEAD text and line changes of the working file', async () => {
    await writeFile(join(f.projectDir, 'src', 'a.ts'), 'zero\none\nTWO\nthree\nfive\n')
    expect(await service.headText(id, 'E:\\src\\a.ts')).toBe('one\ntwo\nthree\nfour\nfive\n')
    expect(await service.lineChanges(id, 'E:\\src\\a.ts')).toEqual([
      { kind: 'added', start: 1, end: 1, oldLines: [] },
      { kind: 'modified', start: 3, end: 3, oldLines: ['two'] },
      { kind: 'deleted', start: 4, end: 4, oldLines: ['four'] }
    ])
    expect(await service.lineChanges(id, 'E:\\keep.txt')).toEqual([])
  })

  it('marks an untracked file as one added hunk and an ignored one as unchanged', async () => {
    await writeFile(join(f.projectDir, 'u.txt'), 'a\nb\nc\n')
    await writeFile(join(f.projectDir, '.gitignore'), 'ignored.log\n')
    await writeFile(join(f.projectDir, 'ignored.log'), 'x\n')
    expect(await service.lineChanges(id, 'E:\\u.txt')).toEqual([{ kind: 'added', start: 1, end: 3, oldLines: [] }])
    expect(await service.lineChanges(id, 'E:\\ignored.log')).toEqual([])
    expect(await service.headText(id, 'E:\\u.txt')).toBeNull()
  })

  it('reverts a hunk through the user write path, restoring HEAD lines', async () => {
    const file = join(f.projectDir, 'src', 'a.ts')
    await writeFile(file, 'zero\none\nTWO\nthree\nfive\n')
    await service.revertHunk(id, 'E:\\src\\a.ts', 1)
    expect(await readFile(file, 'utf8')).toBe('zero\none\ntwo\nthree\nfive\n')
    await service.revertHunk(id, 'E:\\src\\a.ts', 1) // the deleted line is now hunk 1
    expect(await readFile(file, 'utf8')).toBe('zero\none\ntwo\nthree\nfour\nfive\n')
    await service.revertHunk(id, 'E:\\src\\a.ts', 0)
    expect(await readFile(file, 'utf8')).toBe('one\ntwo\nthree\nfour\nfive\n')
    expect(await service.lineChanges(id, 'E:\\src\\a.ts')).toEqual([])
    await expect(service.revertHunk(id, 'E:\\src\\a.ts', 0)).rejects.toThrow(/no longer exists/)
    expect(f.repos.changes.list(1)).toEqual([])
  })

  it('restores a missing final newline', async () => {
    const file = join(f.projectDir, 'keep.txt')
    await writeFile(file, 'keep')
    expect(await service.lineChanges(id, 'E:\\keep.txt')).toEqual([{ kind: 'modified', start: 1, end: 1, oldLines: ['keep'], noEolNew: true }])
    await service.revertHunk(id, 'E:\\keep.txt', 0)
    expect(await readFile(file, 'utf8')).toBe('keep\n')
  })

  it('pushes git.changed debounced per drive', async () => {
    service.touched(id, 'E:\\src\\a.ts')
    service.touched(id, 'E:\\keep.txt')
    await new Promise((r) => setTimeout(r, 40))
    expect(events.payloads('git.changed')).toEqual([{ desktopId: id, root: 'E:\\' }])
  })

  it('a rename of the working file shows up as delete plus untracked', async () => {
    await rename(join(f.projectDir, 'keep.txt'), join(f.projectDir, 'moved.txt'))
    const entries = (await service.status(id, 'E:\\'))!.entries
    expect(entries.map((e) => `${e.index}${e.worktree} ${e.path}`).sort()).toEqual(['?? E:\\moved.txt', ' D E:\\keep.txt'].sort())
  })
})

