/**
 * The virtual file system of a desktop and the launcher contract.
 *
 * Every desktop is a long-lived virtual machine:
 *  - `C:` is its private system disk, a real directory in AgentXP's app data
 *    (`<userData>/desktops/<id>/C`), seeded with Users\Agent\{Desktop,Documents,Downloads}
 *    and Temp. Deleting the desktop deletes it.
 *  - Projects are plugged in as removable USB drives (E:, F:, ...). A drive maps to a
 *    real folder (a `folders` row). "Safely Remove" ejects it: the agent loses access
 *    at once. Deleting the desktop only ejects; real folders are never touched.
 *
 * All paths that reach the agent, the views and the apps are virtual paths (VPath):
 * a drive letter, a colon and backslash-separated segments, e.g. `E:\src\index.ts`.
 * Main maps them to real paths and refuses anything outside C: or a plugged-in drive.
 *
 * Pure types and pure helpers only.
 */
import type { Id, IsoDate } from './models'
import type { FileFindQuery, FileFindResultDto, TextSearchQuery, TextSearchResultDto } from './search'

/** `C:\Users\Agent\notes.md`. Always absolute, backslashes, upper-case drive letter, no trailing backslash except a drive root (`E:\`). */
export type VPath = string

export type DriveLetter = string // 'C' | 'E'..'Z'
export const SYSTEM_DRIVE: DriveLetter = 'C'
/** Removable drives get the first free letter from E. (D: is skipped, like a WinXP DVD drive.) */
export const FIRST_REMOVABLE_LETTER: DriveLetter = 'E'

export interface DriveDto {
  letter: DriveLetter
  /** Volume label: "Local Disk" for C:, the folder name for a USB drive. */
  label: string
  kind: 'system' | 'removable'
  /** The plugged-in project folder; null for C:. */
  folderId: Id | null
  pluggedAt: IsoDate | null
}

/** How many removed projects a desktop remembers (Computer shows the newest three). */
export const REMOVED_PROJECTS_KEPT = 5

/** A project that was removed from a desktop and can be plugged in again (Computer's "Recently removed"). */
export interface RemovedProjectDto {
  folderId: Id
  /** The project's name (`login-app`). */
  label: string
  /** The letter it had (`E`). */
  letter: DriveLetter
  removedAt: IsoDate
}

export const SYSTEM_SEED_DIRS: readonly VPath[] = [
  'C:\\Users\\Agent\\Desktop',
  'C:\\Users\\Agent\\Documents',
  'C:\\Users\\Agent\\Downloads',
  'C:\\Temp'
]
/** Default working directory of a chat when no project drive is chosen. */
export const AGENT_HOME: VPath = 'C:\\Users\\Agent'

export interface VfsEntryDto {
  name: string
  path: VPath
  kind: 'file' | 'directory'
  size: number | null
  modifiedAt: IsoDate | null
}

// ---------------------------------------------------------------- pure helpers

const VPATH_RE = /^([A-Za-z]):(?:[\\/](.*))?$/

export interface ParsedVPath {
  drive: DriveLetter
  /** Segments below the drive root, never containing '.', '..' or ''. */
  segments: string[]
}

/** Parses and normalises; returns null for relative paths or paths that escape the drive root. */
export function parseVPath(input: string): ParsedVPath | null {
  const m = VPATH_RE.exec(input.trim())
  if (!m) return null
  const segments: string[] = []
  for (const part of (m[2] ?? '').split(/[\\/]+/)) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    if (/[<>:"|?*\u0000-\u001f]/.test(part)) return null
    segments.push(part)
  }
  return { drive: m[1].toUpperCase(), segments }
}

export function formatVPath(p: ParsedVPath): VPath {
  return `${p.drive}:\\${p.segments.join('\\')}`
}

export function normaliseVPath(input: string): VPath | null {
  const p = parseVPath(input)
  return p ? formatVPath(p) : null
}

export function joinVPath(base: VPath, ...parts: string[]): VPath | null {
  return normaliseVPath([base, ...parts].join('\\'))
}

export function vpathParent(path: VPath): VPath | null {
  const p = parseVPath(path)
  if (!p || p.segments.length === 0) return null
  return formatVPath({ drive: p.drive, segments: p.segments.slice(0, -1) })
}

export function vpathName(path: VPath): string {
  const p = parseVPath(path)
  if (!p) return path
  return p.segments.at(-1) ?? `${p.drive}:`
}

/** The first free removable letter, or null when E..Z are all used. */
export function nextDriveLetter(used: Iterable<DriveLetter>): DriveLetter | null {
  const taken = new Set([...used].map((l) => l.toUpperCase()))
  for (let c = FIRST_REMOVABLE_LETTER.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
    const l = String.fromCharCode(c)
    if (!taken.has(l)) return l
  }
  return null
}

/** The message an agent gets when it touches an ejected or unknown drive. */
export function noDriveMessage(letter: DriveLetter, removedProject?: string): string {
  if (removedProject) return `Drive ${letter}: is not plugged in on this desktop. ${removedProject} was removed. Ask the user to open Computer and choose Plug in again.`
  return `Drive ${letter}: is not plugged in on this desktop. Ask the user to plug the project in, or work on C:.`
}

// ---------------------------------------------------------------- IPC

export interface VfsApi {
  readDir(desktopId: Id, path: VPath): Promise<VfsEntryDto[]>
  /** Find in files below `root` (the Code app's Search tab). */
  searchText(desktopId: Id, root: VPath, query: TextSearchQuery): Promise<TextSearchResultDto>
  /** Files and folders below `root` by name and/or contents (Explorer's Search Companion). */
  find(desktopId: Id, root: VPath, query: FileFindQuery): Promise<FileFindResultDto>
  readFile(desktopId: Id, path: VPath): Promise<string>
  /** A user save (Notepad, WordPad): not recorded as an agent change. */
  writeFile(desktopId: Id, path: VPath, text: string): Promise<void>
  stat(desktopId: Id, path: VPath): Promise<VfsEntryDto | null>
  /** A binary file (Paint opens a picture). */
  readBytes(desktopId: Id, path: VPath): Promise<Uint8Array>
  /** A user save of a binary file (Paint saves a picture). */
  writeBytes(desktopId: Id, path: VPath, bytes: Uint8Array): Promise<void>
}

export interface DrivesApi {
  list(desktopId: Id): Promise<DriveDto[]>
  /** Plugs a project in as a USB drive. Without `folderId` shows the folder picker; null when cancelled. */
  plugIn(desktopId: Id, folderId?: Id): Promise<DriveDto | null>
  /** Safely Remove: the agent loses access at once. Chats whose working directory is on it keep running but get refusals. */
  eject(desktopId: Id, letter: DriveLetter): Promise<void>
}

// ---------------------------------------------------------------- launcher

export type DesktopRunState = 'idle' | 'working' | 'awaiting_approval' | 'error'

/** One row of the launcher ("Remote Desktop Connection" style desktop selector). */
export interface DesktopSummaryDto {
  id: Id
  title: string
  /** True while an OS window shows it. Closing the window disconnects; agents keep running. */
  connected: boolean
  runState: DesktopRunState
  /** Why the desktop's agent could not start (run state `error`), else null. */
  lastError?: string | null
  /** The default agent's command was not found (checked when the launcher opens): the row shows the error. Else null. */
  agentProblem?: string | null
  pendingApprovals: number
  chatCount: number
  drives: DriveDto[]
  /** `file://` URL of the last thumbnail (a PNG in the desktop's app-data folder), null before the first. */
  thumbnailUrl: string | null
  lastUsedAt: IsoDate
  createdAt: IsoDate
}

export interface NewDesktopInput {
  title: string
  /** Projects to plug in at creation (optional). */
  folderIds: Id[]
  agentId?: Id
}

export interface LauncherApi {
  list(): Promise<DesktopSummaryDto[]>
  create(input: NewDesktopInput): Promise<DesktopSummaryDto>
  /** Opens (or focuses) the desktop's OS window. */
  connect(id: Id): Promise<void>
  /** Closes its OS window; agents and turns keep running. */
  disconnect(id: Id): Promise<void>
  rename(id: Id, title: string): Promise<void>
  /** Stops its agents and deletes everything virtual (C:, chats, windows, notes, logs). Ejects drives; real folders untouched. */
  remove(id: Id): Promise<void>
  /** Shows the launcher window (from a desktop's Start menu). */
  show(): Promise<void>
  /** Looks for the default agent program of every desktop (nothing is started) and updates the rows' `agentProblem`. */
  checkAgents(): Promise<void>
}

export interface LauncherEvents {
  'launcher.changed': DesktopSummaryDto[]
}
