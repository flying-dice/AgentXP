import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createVfsFixture } from '../test-helpers'
import { FileSearch, MAX_SEARCHED_FILE_BYTES } from './FileSearch'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let search: FileSearch
let desktopId: number

beforeEach(async () => {
  f = await createVfsFixture()
  desktopId = f.desktop.id
  search = new FileSearch(f.vfs)
  for (const dir of ['src/lib', 'node_modules/dep', '.git']) await mkdir(join(f.projectDir, dir), { recursive: true })
  const files: Record<string, string> = {
    'README.md': 'Hello world\nsecond line\n',
    'src/app.ts': 'const greeting = "hello"\nexport function Hello() {}\n',
    'src/lib/util.ts': 'export const answer = 42\n',
    'src/lib/notes.txt': 'nothing here\n',
    'node_modules/dep/index.js': 'hello from a dependency\n',
    '.git/config': 'hello git\n'
  }
  for (const [name, text] of Object.entries(files)) await writeFile(join(f.projectDir, name), text)
  await writeFile(join(f.projectDir, 'logo.png'), Buffer.from([0x89, 0x50, 0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f]))
})

describe('FileSearch.searchText', () => {
  it('finds every matching line below a folder, skipping .git, node_modules and binary files', async () => {
    const result = await search.searchText(desktopId, 'E:\\', { query: 'hello' })
    expect(result.matches.map((m) => `${m.path}:${m.line}:${m.column}`)).toEqual(['E:\\README.md:1:1', 'E:\\src\\app.ts:1:19', 'E:\\src\\app.ts:2:17'])
    expect(result).toMatchObject({ filesMatched: 2, truncated: false })
    expect(result.matches[1]).toMatchObject({ text: 'const greeting = "hello"', length: 5, textStart: 18 })
  })

  it('honours matchCase, regex, include and a single file as the root', async () => {
    expect((await search.searchText(desktopId, 'E:\\', { query: 'Hello', matchCase: true })).matches.map((m) => m.path)).toEqual(['E:\\README.md', 'E:\\src\\app.ts'])
    expect((await search.searchText(desktopId, 'E:\\', { query: 'answer = \\d+', regex: true })).matches.map((m) => m.path)).toEqual(['E:\\src\\lib\\util.ts'])
    expect((await search.searchText(desktopId, 'E:\\', { query: 'e', include: '*.txt' })).matches.map((m) => m.path)).toEqual(['E:\\src\\lib\\notes.txt'])
    expect((await search.searchText(desktopId, 'E:\\src\\app.ts', { query: 'hello' })).matches).toHaveLength(2)
  })

  it('stops at the limit and says there is more', async () => {
    const result = await search.searchText(desktopId, 'E:\\', { query: 'hello', limit: 2 })
    expect(result.matches).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })

  it('skips files that are too big', async () => {
    await writeFile(join(f.projectDir, 'big.txt'), `hello\n${'x'.repeat(MAX_SEARCHED_FILE_BYTES)}`)
    expect((await search.searchText(desktopId, 'E:\\', { query: 'hello', include: 'big.txt' })).matches).toEqual([])
  })

  it('refuses a bad query, a missing folder and an ejected drive with a readable message', async () => {
    await expect(search.searchText(desktopId, 'E:\\', { query: '(', regex: true })).rejects.toThrow(/Not a valid regular expression/)
    await expect(search.searchText(desktopId, 'E:\\nope', { query: 'a' })).rejects.toThrow(/does not exist/)
    f.drives.eject(desktopId, 'E')
    await expect(search.searchText(desktopId, 'E:\\', { query: 'a' })).rejects.toThrow(/not plugged in/)
  })
})

describe('FileSearch.find', () => {
  it('finds files and folders by part of the name', async () => {
    const found = await search.find(desktopId, 'E:\\', { name: 'lib' })
    expect(found.entries.map((e) => e.path)).toEqual(['E:\\src\\lib'])
    expect((await search.find(desktopId, 'E:\\', { name: '*.ts' })).entries.map((e) => e.path)).toEqual(['E:\\src\\app.ts', 'E:\\src\\lib\\util.ts'])
  })

  it('finds files by a word in the file, alone or together with the name', async () => {
    expect((await search.find(desktopId, 'E:\\', { containing: 'HELLO' })).entries.map((e) => e.path)).toEqual(['E:\\README.md', 'E:\\src\\app.ts'])
    expect((await search.find(desktopId, 'E:\\', { name: '*.md', containing: 'hello' })).entries.map((e) => e.path)).toEqual(['E:\\README.md'])
    expect((await search.find(desktopId, 'E:\\', { name: '*.md', containing: 'answer' })).entries).toEqual([])
  })

  it('stops at the limit and needs a name or a word', async () => {
    expect(await search.find(desktopId, 'E:\\', { name: '*', limit: 1 })).toMatchObject({ truncated: true })
    await expect(search.find(desktopId, 'E:\\', { name: ' ', containing: '' })).rejects.toThrow(/file name, a word or phrase/)
  })
})
