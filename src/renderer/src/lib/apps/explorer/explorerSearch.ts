/** Explorer's Search Companion (find files by name and contents): pure helpers. The search runs in main (`vfs.find`). */
import type { ExplorerSearchView } from '@shared/desktop'
import type { FileFindResultDto } from '@shared/search'
import { vpathParent, type DriveDto, type VfsEntryDto, type VPath } from '@shared/vfs'
import type { ComboItem } from '../../kit/atoms/ComboBox'
import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
import { typeName } from '../paths'
import { driveRoot, driveTitle, sortDrives } from './explorerModel'

/** The Search Results columns (XP: Name, In Folder, Type). */
export const SEARCH_COLUMNS: ListColumn[] = [
  { key: 'name', header: 'Name', width: 170 },
  { key: 'folder', header: 'In Folder', width: 190 },
  { key: 'type', header: 'Type' }
]

const iconOf = (e: VfsEntryDto): ListRow['icon'] => (e.kind === 'directory' ? 'folder' : /\.(ts|js|svelte|json|css|html|mjs)$/i.test(e.name) ? 'file-code' : 'file-text')

export function searchRows(entries: readonly VfsEntryDto[]): ListRow[] {
  return entries.map((e) => ({ id: e.path, icon: iconOf(e), name: e.name, folder: vpathParent(e.path) ?? '', type: typeName(e.path, e.kind === 'directory') }))
}

/** Look in: the folder Explorer shows (when it is a folder), then every drive. */
export function searchLookIn(path: VPath | '', drives: readonly DriveDto[]): ComboItem[] {
  const items: ComboItem[] = sortDrives(drives).map((d) => ({ value: driveRoot(d.letter), label: driveTitle(d) }))
  return path !== '' && !items.some((i) => i.value === path) ? [{ value: path, label: path }, ...items] : items
}

/** Where a new search looks: the folder shown, else the first project drive, else C:. */
export function defaultLookIn(path: VPath | '', drives: readonly DriveDto[]): VPath {
  if (path !== '') return path
  const usb = sortDrives(drives).find((d) => d.kind === 'removable')
  return driveRoot(usb?.letter ?? 'C')
}

/** The status line under the criteria (and the item count of the status bar while results show). */
export function searchStatus(result: FileFindResultDto | null, searching: boolean, error: string | null): string {
  if (searching) return 'Searching...'
  if (error) return error
  if (!result) return 'Type all or part of the file name, a word or phrase in the file, or both. Then click Search.'
  const n = result.entries.length
  if (n === 0) return 'Search is complete. There are no results to display.'
  return `Search is complete. ${n}${result.truncated ? '+' : ''} file${n === 1 ? '' : 's'} found${result.truncated ? ' (more not shown: narrow the search)' : ''}.`
}

export const explorerSearchKey = (search: ExplorerSearchView | null | undefined): string => JSON.stringify(search ?? null)
