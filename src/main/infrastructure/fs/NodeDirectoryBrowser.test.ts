import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeDirectoryBrowser, uniqueFolderName } from './NodeDirectoryBrowser'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'a7-browse-'))
  await mkdir(join(root, 'login-app', 'src'), { recursive: true })
  await mkdir(join(root, 'Alpha'))
  await mkdir(join(root, '.hidden'))
  await writeFile(join(root, 'readme.txt'), 'x')
})
afterEach(async () => rm(root, { recursive: true, force: true }))

describe('uniqueFolderName', () => {
  it('keeps a free name and numbers a taken one, ignoring case', () => {
    expect(uniqueFolderName('New Folder', new Set())).toBe('New Folder')
    expect(uniqueFolderName('New Folder', new Set(['new folder']))).toBe('New Folder (2)')
    expect(uniqueFolderName('New Folder', new Set(['New Folder', 'New Folder (2)']))).toBe('New Folder (3)')
  })
})

describe('NodeDirectoryBrowser', () => {
  const browser = new NodeDirectoryBrowser({ platform: 'linux' })

  it('lists folders only, sorted, hides dot-folders and says which have sub-folders', async () => {
    const listing = await browser.browse(root)
    expect(listing.entries.map((e) => [e.name, e.hasChildren])).toEqual([
      ['Alpha', false],
      ['login-app', true]
    ])
    expect(listing.entries[1].path).toBe(join(root, 'login-app'))
  })

  it('lists a symbolic link to a folder as a folder (macOS /var, a projects folder on another disk), not one to a file', async () => {
    await symlink(join(root, 'login-app'), join(root, 'linked-app'))
    await symlink(join(root, 'readme.txt'), join(root, 'linked-file'))
    await symlink(join(root, 'gone'), join(root, 'broken-link'))
    const listing = await browser.browse(root)
    expect(listing.entries.map((e) => [e.name, e.hasChildren])).toEqual([
      ['Alpha', false],
      ['linked-app', true],
      ['login-app', true]
    ])
    expect((await browser.browse(join(root, 'linked-app'))).entries.map((e) => e.name)).toEqual(['src'])
  })

  it('lists `/` as the only drive on Linux and offers the shortcuts that exist', async () => {
    const home = new NodeDirectoryBrowser({ platform: 'linux', home: root })
    const listing = await home.browse('')
    expect(listing.entries).toEqual([{ name: '/', path: '/', hasChildren: true }])
    expect(listing.places).toEqual([{ name: 'Home', path: root }])
  })

  it('refuses a relative path with a separator or a missing path with a readable message', async () => {
    await expect(browser.browse('a/b')).rejects.toThrow(/full folder path/)
    await expect(browser.browse(join(root, 'nope'))).rejects.toThrow(/does not exist\. Check the spelling/)
  })

  it('makes a new folder with a unique name and rejects bad names', async () => {
    expect(await browser.makeFolder(root, 'New Folder')).toBe(join(root, 'New Folder'))
    expect(await browser.makeFolder(root, 'New Folder')).toBe(join(root, 'New Folder (2)'))
    await expect(browser.makeFolder(root, 'a/b')).rejects.toThrow(/cannot be empty/)
    await expect(browser.makeFolder(join(root, 'nope'), 'x')).rejects.toThrow(/does not exist/)
  })
})

describe('NodeDirectoryBrowser: projects used before and names', () => {
  it('lists recent folders that still exist, newest first, at most eight, without repeats', async () => {
    const paths = [join(root, 'login-app'), join(root, 'gone'), join(root, 'Alpha'), join(root, 'Alpha')]
    const b = new NodeDirectoryBrowser({ platform: 'linux', home: root, recent: () => paths })
    expect((await b.browse('')).recent).toEqual([
      { name: 'login-app', path: join(root, 'login-app') },
      { name: 'Alpha', path: join(root, 'Alpha') }
    ])
    const many = Array.from({ length: 12 }, (_, i) => join(root, `p${i}`))
    await Promise.all(many.map((p) => mkdir(p)))
    expect((await new NodeDirectoryBrowser({ platform: 'linux', home: root, recent: () => many }).browse('')).recent).toHaveLength(8)
  })

  it('resolves a bare name from the recent folders first, ignoring case', async () => {
    await mkdir(join(root, 'Documents', 'login-app'), { recursive: true })
    const b = new NodeDirectoryBrowser({ platform: 'linux', home: root, recent: () => [join(root, 'login-app')] })
    const listing = await b.browse('LOGIN-APP')
    expect(listing.matches).toEqual([{ name: 'login-app', path: join(root, 'login-app') }])
    expect(listing.path).toBe(join(root, 'login-app'))
  })

  it('searches Documents, Desktop and Home three levels deep and skips dot-folders and node_modules', async () => {
    await mkdir(join(root, 'Documents', 'work', 'docs-site'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'docs-site'), { recursive: true })
    await mkdir(join(root, '.cache', 'docs-site'), { recursive: true })
    await mkdir(join(root, 'a', 'b', 'c', 'deep'), { recursive: true })
    const b = new NodeDirectoryBrowser({ platform: 'linux', home: root })
    expect((await b.browse('docs-site')).matches).toEqual([{ name: 'docs-site', path: join(root, 'Documents', 'work', 'docs-site') }])
    await expect(b.browse('deep')).rejects.toThrow(/No folder called 'deep' was found in your recent folders, Documents, Desktop or Home/)
  })

  it('reports several folders with the same name as matches without choosing one', async () => {
    await mkdir(join(root, 'Documents', 'x', 'twin'), { recursive: true })
    await mkdir(join(root, 'Desktop', 'twin'), { recursive: true })
    const listing = await new NodeDirectoryBrowser({ platform: 'linux', home: root }).browse('twin')
    expect(listing.matches).toHaveLength(2)
    expect(listing.entries).toEqual([])
  })
})
