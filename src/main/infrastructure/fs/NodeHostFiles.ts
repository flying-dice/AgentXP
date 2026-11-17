import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import type { HostEntry, HostFiles } from '../../application/ports'
import { resolveInsideRoot } from './sandbox'

const toEntry = (name: string, info: { isDirectory(): boolean; size: number; mtime: Date }): HostEntry => ({
  name,
  isDirectory: info.isDirectory(),
  size: info.isDirectory() ? null : info.size,
  modifiedAt: info.mtime.toISOString()
})

/** `HostFiles` on the real file system; every call is confined to its root by the workspace path guard. */
export class NodeHostFiles implements HostFiles {
  async list(root: string, relativePath: string): Promise<HostEntry[]> {
    const dir = await resolveInsideRoot(resolve(root), relativePath)
    const entries = await readdir(dir, { withFileTypes: true })
    return Promise.all(
      entries.map(async (e) => {
        const info = await stat(resolve(dir, e.name)).catch(() => null)
        // Broken symlinks and files that vanished while listing still show up, as empty files.
        return info ? toEntry(e.name, info) : { name: e.name, isDirectory: e.isDirectory(), size: null, modifiedAt: null }
      })
    )
  }

  async readText(root: string, relativePath: string): Promise<string> {
    return readFile(await resolveInsideRoot(resolve(root), relativePath), 'utf8')
  }

  async readBytes(root: string, relativePath: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(await resolveInsideRoot(resolve(root), relativePath)))
  }

  async writeText(root: string, relativePath: string, text: string): Promise<void> {
    const target = await resolveInsideRoot(resolve(root), relativePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, text, 'utf8')
  }

  async writeBytes(root: string, relativePath: string, bytes: Uint8Array): Promise<void> {
    const target = await resolveInsideRoot(resolve(root), relativePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }

  async remove(root: string, relativePath: string): Promise<void> {
    await rm(await resolveInsideRoot(resolve(root), relativePath), { force: true })
  }

  async stat(root: string, relativePath: string): Promise<HostEntry | null> {
    const target = await resolveInsideRoot(resolve(root), relativePath)
    const info = await stat(target).catch(() => null)
    return info ? toEntry(basename(target), info) : null
  }

  resolveInside(root: string, relativePath: string): Promise<string> {
    return resolveInsideRoot(resolve(root), relativePath)
  }

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true })
  }

  async removeTree(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true })
  }
}
