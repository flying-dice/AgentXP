import { mkdir, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
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
}

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

const visible = (e: { name: string; isDirectory(): boolean }): boolean => e.isDirectory() && !e.name.startsWith('.')

/** Lists folders of the real disk (the in-app Browse For Folder dialog). Dot-folders are hidden. */
export class NodeDirectoryBrowser implements DirectoryBrowser {
  private readonly platform: NodeJS.Platform
  private readonly home: string

  constructor(options: DirectoryBrowserOptions = {}) {
    this.platform = options.platform ?? process.platform
    this.home = options.home ?? homedir()
  }

  async browse(path: string): Promise<BrowseListingDto> {
    if (path === '') return { path, entries: await this.roots(), places: await this.places() }
    if (!isAbsolute(path)) throw new AppError(`'${path}' is not a full folder path.`)
    const dir = resolve(path)
    let names: string[]
    try {
      names = (await readdir(dir, { withFileTypes: true })).filter(visible).map((e) => e.name)
    } catch {
      throw new AppError(`The folder '${dir}' cannot be opened. It may not exist, or you may not have permission.`)
    }
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const entries = await Promise.all(names.map(async (name): Promise<BrowseEntryDto> => ({ name, path: join(dir, name), hasChildren: await this.hasSubfolders(join(dir, name)) })))
    return { path: dir, entries, places: [] }
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
      return (await readdir(path, { withFileTypes: true })).some(visible)
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
