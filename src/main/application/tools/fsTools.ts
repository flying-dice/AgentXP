import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'

const DEFAULT_FIND_LIMIT = 100
const MAX_VISITED_DIRECTORIES = 2000

/** Case-insensitive match of a file name against a name fragment or a `*` glob. */
export function nameMatcher(pattern: string): (name: string) => boolean {
  const lower = pattern.toLowerCase()
  if (!lower.includes('*')) return (name) => name.toLowerCase().includes(lower)
  const source = lower
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const regex = new RegExp(`^${source}$`)
  return (name) => regex.test(name.toLowerCase())
}

export interface FsToolsDeps {
  vfs: Pick<VirtualFileSystem, 'readDir'>
  paths: ToolPaths
}

const label = (path: VPath, directory: boolean): string => (directory && !path.endsWith('\\') ? `${path}\\` : path)

/** fs_list, fs_find: read-only browsing of the drives (C: and the plugged-in projects). */
export function createFsTools({ vfs, paths }: FsToolsDeps): ToolHandlers<'fs_list' | 'fs_find'> {
  return {
    fs_list: ({ path }, context) =>
      attempt(async () => {
        const entries = await vfs.readDir(context.desktopId, paths.resolve(context, path), { hideIgnored: true })
        if (entries.length === 0) return textResult('(empty)')
        return textResult(entries.map((e) => label(e.path, e.kind === 'directory')).join('\n'))
      }),

    fs_find: ({ pattern, path, limit }, context) =>
      attempt(async () => {
        const matches = nameMatcher(pattern)
        const max = limit ?? DEFAULT_FIND_LIMIT
        const found: string[] = []
        const queue: VPath[] = [paths.resolve(context, path)]
        let visited = 0
        while (queue.length > 0 && found.length < max) {
          if (++visited > MAX_VISITED_DIRECTORIES) throw new AppError('Too many folders to search; narrow the path.')
          for (const entry of await vfs.readDir(context.desktopId, queue.shift()!, { hideIgnored: true })) {
            const directory = entry.kind === 'directory'
            if (matches(entry.name) && found.length < max) found.push(label(entry.path, directory))
            if (directory) queue.push(entry.path)
          }
        }
        return textResult(found.length > 0 ? found.join('\n') : 'No matches.')
      })
  }
}
