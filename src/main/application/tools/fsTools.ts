import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { FolderBrowser } from '../ports'
import type { ToolHandlers } from './catalog'
import { toWorkspacePath } from './paths'
import type { DesktopOps } from './ports'
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
  desktops: Pick<DesktopOps, 'state'>
  browser: Pick<FolderBrowser, 'list'>
}

/** fs_list, fs_find: read-only browsing of the desktop's workspace folder. */
export function createFsTools({ desktops, browser }: FsToolsDeps): ToolHandlers<'fs_list' | 'fs_find'> {
  const rootOf = (desktopId: Id): string => desktops.state(desktopId).folder.path

  return {
    fs_list: ({ path }, { desktopId }) =>
      attempt(async () => {
        const root = rootOf(desktopId)
        const entries = await browser.list(root, toWorkspacePath(root, path))
        if (entries.length === 0) return textResult('(empty)')
        return textResult(entries.map((e) => (e.isDirectory ? `${e.path}/` : e.path)).join('\n'))
      }),

    fs_find: ({ pattern, path, limit }, { desktopId }) =>
      attempt(async () => {
        const root = rootOf(desktopId)
        const matches = nameMatcher(pattern)
        const max = limit ?? DEFAULT_FIND_LIMIT
        const found: string[] = []
        const queue = [toWorkspacePath(root, path)]
        let visited = 0
        while (queue.length > 0 && found.length < max) {
          if (++visited > MAX_VISITED_DIRECTORIES) throw new AppError('Too many folders to search; narrow the path.')
          for (const entry of await browser.list(root, queue.shift()!)) {
            if (matches(entry.name) && found.length < max) found.push(entry.isDirectory ? `${entry.path}/` : entry.path)
            if (entry.isDirectory) queue.push(entry.path)
          }
        }
        return textResult(found.length > 0 ? found.join('\n') : 'No matches.')
      })
  }
}
