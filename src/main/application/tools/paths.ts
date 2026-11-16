import { isAbsolute, relative, resolve, sep } from 'node:path'
import { AppError } from '../errors'

/**
 * A workspace-relative path with forward slashes for a path the agent gave (absolute or relative).
 * Throws when it leaves the workspace. '' is the root.
 */
export function toWorkspacePath(root: string, path: string | undefined): string {
  const base = resolve(root)
  const target = resolve(base, path ?? '')
  const rel = relative(base, target)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new AppError(`Path is outside the workspace: ${path}`)
  return rel.split(sep).join('/')
}
