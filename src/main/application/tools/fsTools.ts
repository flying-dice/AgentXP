import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { FileSearch } from '../vfs/FileSearch'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'

export { nameMatcher } from '@shared/search'

export interface FsToolsDeps {
  vfs: Pick<VirtualFileSystem, 'readDir'>
  search: Pick<FileSearch, 'find'>
  paths: ToolPaths
}

const label = (path: VPath, directory: boolean): string => (directory && !path.endsWith('\\') ? `${path}\\` : path)

/** fs_list, fs_find: read-only browsing and searching of the drives (C: and the plugged-in projects). Work: no window opens or changes. */
export function createFsTools({ vfs, search, paths }: FsToolsDeps): ToolHandlers<'fs_list' | 'fs_find'> {
  return {
    fs_list: ({ path }, context) =>
      attempt(async () => {
        const entries = await vfs.readDir(context.desktopId, paths.resolve(context, path), { hideIgnored: true })
        if (entries.length === 0) return textResult('(empty)')
        return textResult(entries.map((e) => label(e.path, e.kind === 'directory')).join('\n'))
      }),

    fs_find: ({ pattern, containing, path, limit }, context) =>
      attempt(async () => {
        const name = pattern?.trim() ?? ''
        const words = containing?.trim() ?? ''
        if (name === '' && words === '') throw new AppError('Give pattern (part of the file name), containing (a word or phrase in the file), or both.')
        const root = paths.resolve(context, path)
        const found = await search.find(context.desktopId, root, { name, containing: words, limit })
        if (found.entries.length === 0) return textResult('No matches.')
        const lines = found.entries.map((e) => label(e.path, e.kind === 'directory'))
        if (found.truncated) lines.push(`(more not shown: raise limit or narrow the search)`)
        return textResult(lines.join('\n'))
      })
  }
}
