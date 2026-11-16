/** Pure model of the Explorer's Computer view: drive titles and order, breadcrumbs, address parsing, nav pane places. */
import { formatVPath, joinVPath, normaliseVPath, parseVPath, vpathParent, type DriveDto, type VPath } from '@shared/vfs'

/** `claude-code-win (E:)`. */
export const driveTitle = (drive: Pick<DriveDto, 'label' | 'letter'>): string => `${drive.label} (${drive.letter}:)`

/** C: first, then the removable drives by letter. */
export function sortDrives<T extends Pick<DriveDto, 'kind' | 'letter'>>(drives: readonly T[]): T[] {
  return [...drives].sort((a, b) => (a.kind === b.kind ? a.letter.localeCompare(b.letter) : a.kind === 'system' ? -1 : 1))
}

/** The two sections of the Computer view. */
export function driveGroups(drives: readonly DriveDto[]): { hardDisks: DriveDto[]; removable: DriveDto[] } {
  const sorted = sortDrives(drives)
  return { hardDisks: sorted.filter((d) => d.kind === 'system'), removable: sorted.filter((d) => d.kind === 'removable') }
}

export const driveRoot = (letter: string): VPath => `${letter.toUpperCase()}:\\`

export interface Crumb {
  label: string
  /** Where a click goes; '' is Computer. */
  path: VPath | ''
}

/** `Computer > claude-code-win (E:) > src` for `E:\src`; just `Computer` for ''. */
export function breadcrumbs(path: VPath | '', drives: readonly DriveDto[]): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Computer', path: '' }]
  const parsed = path === '' ? null : parseVPath(path)
  if (!parsed) return crumbs
  const drive = drives.find((d) => d.letter === parsed.drive)
  crumbs.push({ label: drive ? driveTitle(drive) : `${parsed.drive}:`, path: driveRoot(parsed.drive) })
  parsed.segments.forEach((segment, i) => crumbs.push({ label: segment, path: formatVPath({ drive: parsed.drive, segments: parsed.segments.slice(0, i + 1) }) }))
  return crumbs
}

/** The parent: a drive root goes up to Computer (''), Computer has none. */
export function upPath(path: VPath | ''): VPath | '' {
  if (path === '') return ''
  return vpathParent(path) ?? ''
}

/**
 * What the user typed in the address bar: `Computer`, `E:\src`, `e:/src`, or a drive title such as
 * `claude-code-win (E:)`. Null when it is none of these.
 */
export function parseAddress(text: string, drives: readonly DriveDto[]): VPath | '' | null {
  const trimmed = text.trim()
  if (trimmed === '' || /^computer$/i.test(trimmed)) return ''
  const byTitle = drives.find((d) => driveTitle(d).toLowerCase() === trimmed.toLowerCase())
  if (byTitle) return driveRoot(byTitle.letter)
  const crumbs = /^computer\s*[\\/>]\s*(.*)$/i.exec(trimmed)
  return normaliseVPath(crumbs ? crumbs[1] : trimmed)
}

export interface Place {
  id: string
  label: string
  path: VPath
}

/** Nav pane Favorites: Desktop and Downloads of the agent's home. */
export function favourites(home: VPath): Place[] {
  return [
    { id: 'desktop', label: 'Desktop', path: joinVPath(home, 'Desktop') ?? home },
    { id: 'downloads', label: 'Downloads', path: joinVPath(home, 'Downloads') ?? home }
  ]
}

/** Nav pane Libraries: Documents. */
export function libraries(home: VPath): Place[] {
  return [{ id: 'documents', label: 'Documents', path: joinVPath(home, 'Documents') ?? home }]
}

/** The drive an Explorer path is on, if it is plugged in. */
export const driveOf = (path: VPath | '', drives: readonly DriveDto[]): DriveDto | null => {
  const p = path === '' ? null : parseVPath(path)
  return p ? (drives.find((d) => d.letter === p.drive) ?? null) : null
}

/** The name of a chat's working directory: the project's drive label, or the last folder name (`Agent` for the home). */
export function cwdLabel(cwd: VPath, drives: readonly DriveDto[]): string {
  const parsed = parseVPath(cwd)
  if (!parsed) return cwd
  const drive = drives.find((d) => d.letter === parsed.drive)
  if (parsed.segments.length === 0) return drive ? drive.label : `${parsed.drive}:`
  return parsed.segments[parsed.segments.length - 1]
}

/**
 * The root to review or work on for a path: the plugged-in (project) drive of the path, else the first project drive,
 * else `home`. The system drive (C:) is never preferred while a project is plugged in, since it holds no repository.
 */
export function projectRootOf(drives: readonly DriveDto[], home: VPath, path?: string | null): VPath {
  const removable = sortDrives(drives).filter((d) => d.kind === 'removable')
  const letter = path ? parseVPath(path)?.drive : undefined
  const drive = removable.find((d) => d.letter === letter) ?? removable[0]
  return drive ? driveRoot(drive.letter) : home
}
