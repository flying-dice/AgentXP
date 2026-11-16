import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { FileAccess } from '../../domain/agent/FileAccess'

export class PathOutsideSandboxError extends Error {
  constructor(path: string) {
    super(`Path is outside the workspace: ${path}`)
    this.name = 'PathOutsideSandboxError'
  }
}

export type WriteListener = (path: string, before: string | null, after: string) => void

const isInside = (root: string, target: string): boolean => {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** Text file access confined to one root folder (symlinks included). */
export class WorkspaceFileAccess implements FileAccess {
  private readonly root: string

  constructor(
    root: string,
    private readonly onWrite: WriteListener = () => {}
  ) {
    this.root = resolve(root)
  }

  async readTextFile(path: string, line?: number, limit?: number): Promise<string> {
    const text = await readFile(await this.resolveSafe(path), 'utf8')
    return sliceLines(text, line, limit)
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const target = await this.resolveSafe(path)
    const before = await readFile(target, 'utf8').catch(() => null)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf8')
    this.onWrite(target, before, content)
  }

  /** Absolute path of `path` if it stays inside the root, else throws. */
  private async resolveSafe(path: string): Promise<string> {
    const target = resolve(this.root, path)
    if (!isInside(this.root, target)) throw new PathOutsideSandboxError(path)
    const realRoot = await realpath(this.root)
    const realAncestor = await realpathOfNearestAncestor(target)
    if (!isInside(realRoot, realAncestor)) throw new PathOutsideSandboxError(path)
    return target
  }
}

async function realpathOfNearestAncestor(target: string): Promise<string> {
  let current = target
  for (;;) {
    try {
      return await realpath(current)
    } catch {
      const parent = dirname(current)
      if (parent === current) return current
      current = parent
    }
  }
}

function sliceLines(text: string, line?: number, limit?: number): string {
  if (line === undefined && limit === undefined) return text
  const lines = text.split('\n')
  const start = Math.max((line ?? 1) - 1, 0)
  const end = limit === undefined ? undefined : start + Math.max(limit, 0)
  return lines.slice(start, end).join('\n')
}
