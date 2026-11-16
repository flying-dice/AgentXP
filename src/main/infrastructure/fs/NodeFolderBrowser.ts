import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import type { FileNodeDto } from '@shared/models'
import type { FolderBrowser } from '../../application/ports'
import { resolveInsideRoot } from './sandbox'

const IGNORED = new Set(['.git', 'node_modules'])

const byFoldersFirstThenName = (a: FileNodeDto, b: FileNodeDto): number =>
  Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

/** Lists and reads files below a registered folder; refuses anything outside it. */
export class NodeFolderBrowser implements FolderBrowser {
  async list(root: string, relativePath: string): Promise<FileNodeDto[]> {
    const base = resolve(root)
    const dir = await resolveInsideRoot(base, relativePath)
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => !IGNORED.has(e.name))
      .map((e) => ({ name: e.name, path: relative(base, join(dir, e.name)), isDirectory: e.isDirectory() }))
      .sort(byFoldersFirstThenName)
  }

  async readText(root: string, relativePath: string): Promise<string> {
    return readFile(await resolveInsideRoot(resolve(root), relativePath), 'utf8')
  }
}
