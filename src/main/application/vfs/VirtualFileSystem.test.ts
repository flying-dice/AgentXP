import { mkdir, symlink, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createVfsFixture, tempDir } from '../test-helpers'
import { DriveUnavailableError } from './errors'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let id: number

beforeEach(async () => {
  f = await createVfsFixture()
  id = f.desktop.id
})

describe('C: seeding', () => {
  it('creates the home folders on the desktop disk', async () => {
    expect((await f.vfs.readDir(id, 'C:\\Users\\Agent')).map((e) => e.name)).toEqual(['Desktop', 'Documents', 'Downloads'])
    expect((await f.vfs.readDir(id, 'C:\\')).map((e) => e.name)).toEqual(['Temp', 'Users'])
  })

  it('is idempotent and keeps files', async () => {
    await f.vfs.writeFile(id, 'C:\\Users\\Agent\\Documents\\a.md', 'x')
    await f.vfs.seedSystemDisk(id)
    expect(await f.vfs.readFile(id, 'C:\\Users\\Agent\\Documents\\a.md')).toBe('x')
  })

  it('deletes the whole desktop folder', async () => {
    await f.vfs.deleteDesktopFolder(id)
    await expect(f.vfs.readDir(id, 'C:\\')).rejects.toThrow()
  })
})

describe('Computer and drives', () => {
  it('lists the drives for the empty path', async () => {
    expect((await f.vfs.readDir(id, '')).map((e) => e.path)).toEqual(['C:\\', 'E:\\'])
  })

  it('maps real paths back to VPaths and refuses real paths outside the drives', async () => {
    await writeFile(join(f.projectDir, 'a.txt'), 'A')
    const real = await f.vfs.realPath(id, 'E:\\a.txt')
    expect(f.vfs.toVPath(id, real)).toBe('E:\\a.txt')
    expect(f.vfs.toVPath(id, '/etc/passwd')).toBeNull()
    expect(f.vfs.toVPath(id, join(f.desktopsDir, String(id), 'C', 'Users'))).toBe('C:\\Users')
  })

  it('resolves relative input against the cwd', () => {
    expect(f.vfs.resolveInput(id, 'E:\\src', 'a.ts')).toBe('E:\\src\\a.ts')
    expect(f.vfs.resolveInput(id, 'E:\\src', '..\\b.ts')).toBe('E:\\b.ts')
    expect(f.vfs.resolveInput(id, 'E:\\src', 'C:\\x')).toBe('C:\\x')
  })
})

describe('escapes', () => {
  it('refuses .. beyond the drive root', async () => {
    await expect(f.vfs.readFile(id, 'E:\\..\\x')).rejects.toThrow(/Not a valid path/)
  })

  it('refuses a symlink that points outside the drive', async () => {
    const outside = tempDir('agent7-outside-')
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await symlink(outside, join(f.projectDir, 'link'))
    await expect(f.vfs.readFile(id, 'E:\\link\\secret.txt')).rejects.toThrow()
    await expect(f.vfs.writeFile(id, 'E:\\link\\new.txt', 'x')).rejects.toThrow()
    await expect(readFile(join(outside, 'new.txt'))).rejects.toThrow()
  })

  it('stat returns null for a missing file and a kind for existing ones', async () => {
    await mkdir(join(f.projectDir, 'd'))
    expect(await f.vfs.stat(id, 'E:\\nope')).toBeNull()
    expect(await f.vfs.stat(id, 'E:\\d')).toMatchObject({ kind: 'directory' })
  })
})

describe('ejected and unknown drives', () => {
  it('refuses at once after eject, naming the drive', async () => {
    await f.vfs.writeFile(id, 'E:\\a.txt', 'A')
    f.drives.eject(id, 'E')
    await expect(f.vfs.readFile(id, 'E:\\a.txt')).rejects.toBeInstanceOf(DriveUnavailableError)
    await expect(f.vfs.readFile(id, 'E:\\a.txt')).rejects.toThrow(/Drive E: is not plugged in/)
    expect((await f.vfs.readDir(id, '')).map((e) => e.path)).toEqual(['C:\\'])
  })

  it('refuses a drive that never existed', async () => {
    await expect(f.vfs.readFile(id, 'Q:\\a.txt')).rejects.toThrow(/Drive Q:/)
  })

  it('works again when the project is plugged back in (maybe under the same letter)', async () => {
    await f.vfs.writeFile(id, 'E:\\a.txt', 'A')
    f.drives.eject(id, 'E')
    f.drives.plugInFolder(id, f.folder.id)
    expect(await f.vfs.readFile(id, 'E:\\a.txt')).toBe('A')
  })
})
