import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { FileChangeRecorder } from './FileChangeRecorder'
import { SessionFiles } from './SessionFiles'
import { createVfsFixture } from './test-helpers'
import { DriveUnavailableError, OutsideDrivesError } from './vfs/errors'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let root: string
let sessionId: number
let access: ReturnType<SessionFiles['forSession']>['forSession'] extends (...a: never[]) => infer R ? R : never

beforeEach(async () => {
  f = await createVfsFixture()
  root = await realpath(f.projectDir)
  sessionId = f.repos.sessions.create({ agentId: f.agentId, desktopId: f.desktop.id, cwd: 'E:\\', title: 'chat' }).id
  const files = new SessionFiles({ vfs: f.vfs, host: f.host, sessions: f.repos.sessions, recorder: new FileChangeRecorder(f.repos.changes, f.publisher) })
  access = files.forSession(sessionId).forSession('')
})

describe('ACP path gating', () => {
  it('allows real paths inside a plugged drive and records the write as a VPath change', async () => {
    await access.writeTextFile(join(root, 'a.txt'), 'hi')
    expect(await readFile(join(root, 'a.txt'), 'utf8')).toBe('hi')
    expect(f.repos.changes.list(sessionId).map((c) => c.path)).toEqual(['E:\\a.txt'])
    expect(await access.readTextFile(join(root, 'a.txt'))).toBe('hi')
  })

  it('allows real paths inside C:', async () => {
    const home = join(f.desktopsDir, String(f.desktop.id), 'C', 'Users', 'Agent', 'n.md')
    await access.writeTextFile(home, 'note')
    expect(await access.readTextFile(home)).toBe('note')
    expect(f.repos.changes.list(sessionId).map((c) => c.path)).toEqual(['C:\\Users\\Agent\\n.md'])
  })

  it('slices by line and limit', async () => {
    await writeFile(join(root, 'l.txt'), 'a\nb\nc\nd')
    expect(await access.readTextFile(join(root, 'l.txt'), 2, 2)).toBe('b\nc')
  })

  it('refuses real paths outside every drive', async () => {
    await expect(access.readTextFile('/etc/passwd')).rejects.toBeInstanceOf(OutsideDrivesError)
    await expect(access.writeTextFile(join(root, '..', 'escape.txt'), 'x')).rejects.toBeInstanceOf(OutsideDrivesError)
  })

  it('refuses a symlink out of the drive', async () => {
    const { symlink } = await import('node:fs/promises')
    await mkdir(join(root, '..', 'a7-outside-x'), { recursive: true }).catch(() => {})
    await symlink('/etc', join(root, 'etc-link'))
    await expect(access.readTextFile(join(root, 'etc-link', 'hostname'))).rejects.toThrow()
  })

  it('refuses at once after eject with the message that names the drive', async () => {
    await access.writeTextFile(join(root, 'a.txt'), 'hi')
    f.drives.eject(f.desktop.id, 'E')
    await expect(access.readTextFile(join(root, 'a.txt'))).rejects.toBeInstanceOf(DriveUnavailableError)
    await expect(access.writeTextFile(join(root, 'a.txt'), 'x')).rejects.toThrow(/Drive E: is not plugged in/)
  })

  it('resolves the cwd: the chat cwd by default, a real path inside a drive, and refuses others', async () => {
    expect(await access.resolveCwd!()).toBe(root)
    await mkdir(join(root, 'sub'))
    expect(await access.resolveCwd!(join(root, 'sub'))).toBe(join(root, 'sub'))
    await expect(access.resolveCwd!('/tmp')).rejects.toBeInstanceOf(OutsideDrivesError)
    f.drives.eject(f.desktop.id, 'E')
    await expect(access.resolveCwd!()).rejects.toThrow(/Drive E:/)
  })
})
