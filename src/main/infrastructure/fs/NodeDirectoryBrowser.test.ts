import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

  it('lists `/` as the only drive on Linux and offers the shortcuts that exist', async () => {
    const home = new NodeDirectoryBrowser({ platform: 'linux', home: root })
    const listing = await home.browse('')
    expect(listing.entries).toEqual([{ name: '/', path: '/', hasChildren: true }])
    expect(listing.places).toEqual([{ name: 'Home', path: root }])
  })

  it('refuses a relative or missing path with a readable message', async () => {
    await expect(browser.browse('login-app')).rejects.toThrow(/full folder path/)
    await expect(browser.browse(join(root, 'nope'))).rejects.toThrow(/cannot be opened/)
  })

  it('makes a new folder with a unique name and rejects bad names', async () => {
    expect(await browser.makeFolder(root, 'New Folder')).toBe(join(root, 'New Folder'))
    expect(await browser.makeFolder(root, 'New Folder')).toBe(join(root, 'New Folder (2)'))
    await expect(browser.makeFolder(root, 'a/b')).rejects.toThrow(/cannot be empty/)
    await expect(browser.makeFolder(join(root, 'nope'), 'x')).rejects.toThrow(/does not exist/)
  })
})
