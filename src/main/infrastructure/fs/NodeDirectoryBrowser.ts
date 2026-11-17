import { mkdir, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, resolve } from 'node:path'
import type { BrowseEntryDto, BrowseListingDto, BrowsePlaceDto } from '@shared/models'
import { AppError } from '../../application/errors'
import type { DirectoryBrowser } from '../../application/ports'

const INVALID_NAME = /[\\/:*?"<>|]/

/** "New Folder", then "New Folder (2)", "New Folder (3)", ... the first name `taken` does not contain. */
export function uniqueFolderName(name: string, taken: ReadonlySet<string>): string {
  const lower = new Set([...taken].map((n) => n.toLowerCase()))
  if (!lower.has(name.toLowerCase())) return name
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`
    if (!lower.has(candidate.toLowerCase())) return candidate
  }
}

export interface DirectoryBrowserOptions {
  platform?: NodeJS.Platform
  home?: string
  /** Folder paths the user used before, newest first. */
  recent?: () => string[]
  /** Time limit of a search by name, in milliseconds. */
  searchLimitMs?: number
}

/** How many "Projects you used before" the dialog lists. */
export const MAX_RECENT = 8
/** How deep a search by name looks under Documents, Desktop and Home. */
export const SEARCH_DEPTH = 3
const SEARCH_LIMIT_MS = 2000
const isBareName = (text: string): boolean => text !== '' && !/[\\/:]/.test(text)

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const visible = (e: { name: string; isDirectory(): boolean }): boolean => e.isDirectory() && !e.name.startsWith('.')

/**
 * The folders of `dir`, dot-folders hidden. A symbolic link to a folder counts as a folder (macOS `/var`, a projects folder
 * linked to another disk), like a junction in the XP dialog. Throws when `dir` cannot be read.
 */
async function folderNames(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const linked = await Promise.all(
    entries
      .filter((e) => e.isSymbolicLink() && !e.name.startsWith('.'))
      .map(async (e) => ((await stat(join(dir, e.name)).catch(() => null))?.isDirectory() ? e.name : null))
  )
  return [...entries.filter(visible).map((e) => e.name), ...linked.filter((n): n is string => n !== null)]
}

/** Lists folders of the real disk (the in-app Browse For Folder dialog). Dot-folders are hidden. */
export class NodeDirectoryBrowser implements DirectoryBrowser {
  private readonly platform: NodeJS.Platform
  private readonly home: string
  private readonly recent: () => string[]
  private readonly searchLimitMs: number

  constructor(options: DirectoryBrowserOptions = {}) {
    this.platform = options.platform ?? process.platform
    this.home = options.home ?? homedir()
    this.recent = options.recent ?? (() => [])
    this.searchLimitMs = options.searchLimitMs ?? SEARCH_LIMIT_MS
  }

  async browse(path: string): Promise<BrowseListingDto> {
    if (path === '') return { path, entries: await this.roots(), places: await this.places(), recent: await this.recentFolders() }
    if (isBareName(path)) return this.resolveName(path)
    if (!isAbsolute(path)) throw new AppError(`'${path}' is not a full folder path.`)
    const dir = resolve(path)
    let names: string[]
    try {
      names = await folderNames(dir)
    } catch {
      if (!(await exists(dir))) throw new AppError(`The folder '${dir}' does not exist. Check the spelling, or select the parent folder and click Make New Folder.`)
      throw new AppError(`The folder '${dir}' cannot be opened. It may not exist, or you may not have permission.`)
    }
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const entries = await Promise.all(names.map(async (name): Promise<BrowseEntryDto> => ({ name, path: join(dir, name), hasChildren: await this.hasSubfolders(join(dir, name)) })))
    return { path: dir, entries, places: [] }
  }

  /** A name the user typed instead of a path: "Projects you used before" first, then Documents, Desktop and Home. */
  private async resolveName(name: string): Promise<BrowseListingDto> {
    const lower = name.toLowerCase()
    const known = (await this.recentFolders()).filter((p) => p.name.toLowerCase() === lower)
    const found = known.length > 0 ? known : await this.searchByName(lower)
    if (found.length === 0) {
      throw new AppError(`No folder called '${name}' was found in your recent folders, Documents, Desktop or Home. Type the full path, for example C:\\Users\\you\\${name}, or choose a folder in the list.`)
    }
    const listing = found.length === 1 ? await this.browse(found[0].path) : { path: '', entries: [], places: [] }
    return { ...listing, matches: found }
  }

  private async searchByName(lower: string): Promise<BrowsePlaceDto[]> {
    const deadline = Date.now() + this.searchLimitMs
    const found = new Map<string, BrowsePlaceDto>()
    const roots = [join(this.home, 'Documents'), join(this.home, 'Desktop'), this.home]
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > SEARCH_DEPTH || Date.now() > deadline) return
      let names: string[]
      try {
        names = (await readdir(dir, { withFileTypes: true })).filter((e) => visible(e) && e.name !== 'node_modules').map((e) => e.name)
      } catch {
        return
      }
      for (const n of names) {
        if (n.toLowerCase() === lower) found.set(join(dir, n), { name: n, path: join(dir, n) })
      }
      for (const n of names) await walk(join(dir, n), depth + 1)
    }
    for (const root of roots) await walk(root, 1)
    return [...found.values()]
  }

  /** Recent folders that still exist, newest first. */
  private async recentFolders(): Promise<BrowsePlaceDto[]> {
    const seen = new Set<string>()
    const paths = this.recent().filter((p) => (seen.has(p) ? false : !!seen.add(p)))
    const present = await Promise.all(paths.map(async (p) => ((await isDirectory(p)) ? { name: basename(p) || p, path: p } : null)))
    return present.filter((p): p is BrowsePlaceDto => p !== null).slice(0, MAX_RECENT)
  }

  async makeFolder(parent: string, name: string): Promise<string> {
    const clean = name.trim()
    if (!clean || INVALID_NAME.test(clean)) throw new AppError('A folder name cannot be empty or contain \\ / : * ? " < > |')
    if (!isAbsolute(parent) || !(await isDirectory(parent))) throw new AppError(`The folder '${parent}' does not exist.`)
    const path = join(resolve(parent), uniqueFolderName(clean, new Set(await readdir(parent))))
    try {
      await mkdir(path)
    } catch {
      throw new AppError(`Could not create the folder in '${parent}'. You may not have permission.`)
    }
    return path
  }

  private async hasSubfolders(path: string): Promise<boolean> {
    try {
      return (await folderNames(path)).length > 0
    } catch {
      return false
    }
  }

  /** Drive letters that exist on Windows, `/` elsewhere. */
  private async roots(): Promise<BrowseEntryDto[]> {
    if (this.platform !== 'win32') return [{ name: '/', path: '/', hasChildren: true }]
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZAB'.split('')
    const found = await Promise.all(letters.map(async (l) => ((await isDirectory(`${l}:\\`)) ? l : null)))
    return found.filter((l): l is string => l !== null).map((l) => ({ name: `${l}:`, path: `${l}:\\`, hasChildren: true }))
  }

  private async places(): Promise<BrowsePlaceDto[]> {
    const candidates: BrowsePlaceDto[] = [
      { name: 'Home', path: this.home },
      { name: 'Documents', path: join(this.home, 'Documents') },
      { name: 'Desktop', path: join(this.home, 'Desktop') }
    ]
    const present = await Promise.all(candidates.map(async (p) => ((await isDirectory(p.path)) ? p : null)))
    return present.filter((p): p is BrowsePlaceDto => p !== null)
  }
}
