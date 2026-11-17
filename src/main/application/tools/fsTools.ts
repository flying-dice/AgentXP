import type { AppView, ExplorerSearchView } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { FileSearch } from '../vfs/FileSearch'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'
import { pickWindow } from './windows'

export { nameMatcher } from '@shared/search'

export interface FsToolsDeps {
  desktops: DesktopOps
  vfs: Pick<VirtualFileSystem, 'readDir'>
  search: Pick<FileSearch, 'find'>
  paths: ToolPaths
}

type ExplorerView = Extract<AppView, { app: 'explorer' }>

const label = (path: VPath, directory: boolean): string => (directory && !path.endsWith('\\') ? `${path}\\` : path)

/** Shows a search in Explorer's Search Companion: the focused or front-most Explorer, or a new one opened by the agent. */
function showSearch(desktops: DesktopOps, desktopId: Id, search: ExplorerSearchView): void {
  const state = desktops.state(desktopId)
  const open = state.windows.some((w) => w.app === 'explorer')
  const window = open ? pickWindow(state, 'explorer') : desktops.openWindow({ desktopId, app: 'explorer', path: search.root }, 'agent')
  const view = pickWindow(desktops.state(desktopId), 'explorer', window.id).view as ExplorerView
  desktops.updateView(window.id, { ...view, path: search.root, selected: [], search })
}

/** fs_list, fs_find: read-only browsing and searching of the drives (C: and the plugged-in projects). */
export function createFsTools({ desktops, vfs, search, paths }: FsToolsDeps): ToolHandlers<'fs_list' | 'fs_find'> {
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
        showSearch(desktops, context.desktopId, { name, containing: words, root, by: 'agent' })
        if (found.entries.length === 0) return textResult('No matches.')
        const lines = found.entries.map((e) => label(e.path, e.kind === 'directory'))
        if (found.truncated) lines.push(`(more not shown: raise limit or narrow the search)`)
        return textResult(lines.join('\n'))
      })
  }
}
