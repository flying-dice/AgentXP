import { realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

export class PathOutsideSandboxError extends Error {
  constructor(path: string) {
    super(`Path is outside the workspace: ${path}`)
    this.name = 'PathOutsideSandboxError'
  }
}

const isInside = (root: string, target: string): boolean => {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
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

/** Absolute path of `path` (absolute, or relative to `root`) if it stays inside `root` (symlinks included), else throws. */
export async function resolveInsideRoot(root: string, path: string): Promise<string> {
  const target = resolve(root, path)
  if (!isInside(root, target)) throw new PathOutsideSandboxError(path)
  const realRoot = await realpath(root)
  if (!isInside(realRoot, await realpathOfNearestAncestor(target))) throw new PathOutsideSandboxError(path)
  return target
}
