import { readdir, readFile, stat } from 'node:fs/promises'
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

  async gitBranch(root: string): Promise<string | null> {
    const gitDir = await findGitDir(resolve(root))
    if (!gitDir) return null
    try {
      return parseHead(await readFile(join(gitDir, 'HEAD'), 'utf8'))
    } catch {
      return null
    }
  }
}

/** `.git` is a directory, or a file `gitdir: <path>` in worktrees and submodules. */
async function findGitDir(root: string): Promise<string | null> {
  const dotGit = join(root, '.git')
  try {
    const info = await stat(dotGit)
    if (info.isDirectory()) return dotGit
    const match = /^gitdir:\s*(.+)$/m.exec(await readFile(dotGit, 'utf8'))
    return match ? resolve(root, match[1].trim()) : null
  } catch {
    return null
  }
}

/** `ref: refs/heads/main` -> `main`; a detached HEAD -> the short commit. */
export function parseHead(head: string): string | null {
  const text = head.trim()
  const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(text)
  if (ref) return ref[1]
  return /^[0-9a-f]{7,}$/i.test(text) ? text.slice(0, 7) : null
}
