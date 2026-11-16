import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  SYSTEM_DRIVE,
  SYSTEM_SEED_DIRS,
  formatVPath,
  joinVPath,
  normaliseVPath,
  parseVPath,
  type DriveDto,
  type DriveLetter,
  type VPath,
  type VfsEntryDto
} from '@shared/vfs'
import type { Id } from '@shared/models'
import type { FolderRepository } from '../../domain/repositories/folder-repository'
import { AppError } from '../errors'
import type { HostEntry, HostFiles } from '../ports'
import { DriveUnavailableError } from './errors'

/** A drive of one desktop and the real folder behind it. */
export interface Mount {
  letter: DriveLetter
  label: string
  kind: DriveDto['kind']
  /** The plugged-in folder; null for C:. */
  folderId: Id | null
  /** Absolute real path of the drive root. */
  root: string
}

/** A VPath split into its mount and the root-relative path (`/`-separated, '' for the root). */
export interface Located {
  mount: Mount
  relativePath: string
}

export interface VirtualFileSystemDeps {
  host: HostFiles
  folders: Pick<FolderRepository, 'get'>
  /** The drives of a desktop, C: first (`DriveService.list`). */
  drives: { list(desktopId: Id): DriveDto[] }
  /** `<userData>/desktops`: each desktop's system disk is `<desktopsDir>/<id>/C`. */
  desktopsDir: string
}

/** Directory names the agent's listings skip (the Explorer shows them). */
const HIDDEN_FOR_AGENTS = new Set(['.git', 'node_modules'])

const posix = (path: string): string => path.split(sep).join('/')
const sameCase = (path: string): string => (process.platform === 'win32' ? path.toLowerCase() : path)

/**
 * The virtual file system of a desktop: C: (private, in app data) plus the projects plugged in as
 * removable drives. Maps VPaths to real paths and back through the desktop's current drives, so an
 * ejected drive is gone at once. Everything below a drive root goes through `HostFiles`, which
 * refuses escapes (symlinks included).
 */
export class VirtualFileSystem {
  constructor(private readonly deps: VirtualFileSystemDeps) {}

  // ---- drives ------------------------------------------------------------------------------------

  systemRoot(desktopId: Id): string {
    return join(this.deps.desktopsDir, String(desktopId), SYSTEM_DRIVE)
  }

  /** The desktop's drives with their real roots, C: first. */
  mounts(desktopId: Id): Mount[] {
    const mounts: Mount[] = []
    for (const drive of this.deps.drives.list(desktopId)) {
      if (drive.kind === 'system') {
        mounts.push({ letter: drive.letter, label: drive.label, kind: 'system', folderId: null, root: this.systemRoot(desktopId) })
        continue
      }
      const folder = drive.folderId === null ? null : this.deps.folders.get(drive.folderId)
      if (folder) mounts.push({ letter: drive.letter, label: drive.label, kind: 'removable', folderId: folder.id, root: resolve(folder.path) })
    }
    return mounts
  }

  /** The mount of a drive letter; throws `DriveUnavailableError` when it is not plugged in. */
  mountOf(desktopId: Id, letter: DriveLetter): Mount {
    const mount = this.mounts(desktopId).find((m) => m.letter === letter.toUpperCase())
    if (!mount) throw new DriveUnavailableError(letter.toUpperCase())
    return mount
  }

  /** The mount a stored (folder, path) lives on: C: for null, else the drive the folder is plugged in as. */
  mountOfFolder(desktopId: Id, folderId: Id | null): Mount {
    const mount = this.mounts(desktopId).find((m) => m.folderId === folderId)
    if (!mount) throw new AppError('The project this file belongs to is not plugged in on this desktop. Plug it in again first.')
    return mount
  }

  // ---- path mapping --------------------------------------------------------------------------------

  /** Normalises a VPath and finds its mount. Throws `AppError` for malformed paths, `DriveUnavailableError` for missing drives. */
  locate(desktopId: Id, vpath: string): Located {
    const parsed = parseVPath(vpath)
    if (!parsed) throw new AppError(`Not a valid path: ${vpath}. Use a full path such as C:\\Users\\Agent or E:\\src.`)
    return { mount: this.mountOf(desktopId, parsed.drive), relativePath: parsed.segments.join('/') }
  }

  /** The symlink-checked real path of a VPath. */
  async realPath(desktopId: Id, vpath: string): Promise<string> {
    const { mount, relativePath } = this.locate(desktopId, vpath)
    return this.deps.host.resolveInside(mount.root, relativePath)
  }

  /** Finds the drive a real absolute path is on (the deepest root wins); null when it is on none. Textual: no I/O. */
  locateReal(desktopId: Id, realPath: string): Located | null {
    if (!isAbsolute(realPath)) return null
    const target = resolve(realPath)
    let best: Located | null = null
    for (const mount of this.mounts(desktopId)) {
      const rel = relative(sameCase(mount.root), sameCase(target))
      if (rel.startsWith('..') || isAbsolute(rel)) continue
      if (!best || mount.root.length > best.mount.root.length) best = { mount, relativePath: posix(rel) }
    }
    return best
  }

  toVPath(desktopId: Id, realPath: string): VPath | null {
    const located = this.locateReal(desktopId, realPath)
    return located ? this.vpathOf(located.mount, located.relativePath) : null
  }

  vpathOf(mount: Mount, relativePath: string): VPath {
    return formatVPath({ drive: mount.letter, segments: relativePath.split('/').filter(Boolean) })
  }

  /**
   * What a path argument from an agent means: a full VPath, a real absolute path inside a drive, or a path
   * relative to `cwd` (a VPath). The result is normalised and its drive exists.
   */
  resolveInput(desktopId: Id, cwd: VPath, input: string): VPath {
    const text = input.trim()
    const asVPath = normaliseVPath(text)
    let vpath = asVPath
    if (!vpath && isAbsolute(text)) vpath = this.toVPath(desktopId, text)
    if (!vpath && !isAbsolute(text) && !/^[A-Za-z]:/.test(text)) vpath = joinVPath(cwd, text)
    if (!vpath) throw new AppError(`Not a valid path: ${input}. Use a path relative to ${cwd} or a full path such as C:\\Users\\Agent.`)
    this.locate(desktopId, vpath)
    return vpath
  }

  // ---- operations ----------------------------------------------------------------------------------

  /** One directory level, folders first. '' is "Computer": the drives. `hideIgnored` skips .git and node_modules (agent listings). */
  async readDir(desktopId: Id, path: VPath | '', options: { hideIgnored?: boolean } = {}): Promise<VfsEntryDto[]> {
    if (path === '') return this.computer(desktopId)
    const { mount, relativePath } = this.locate(desktopId, path)
    const entries = await this.deps.host.list(mount.root, relativePath)
    const dir = this.vpathOf(mount, relativePath)
    return entries
      .filter((e) => !(options.hideIgnored && HIDDEN_FOR_AGENTS.has(e.name)))
      .map((e) => this.entry(joinVPath(dir, e.name) ?? dir, e))
      .sort((a, b) => Number(b.kind === 'directory') - Number(a.kind === 'directory') || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  async readFile(desktopId: Id, path: VPath): Promise<string> {
    const { mount, relativePath } = this.locate(desktopId, path)
    return this.deps.host.readText(mount.root, relativePath)
  }

  /** Writes a file (not recorded as an agent change). */
  async writeFile(desktopId: Id, path: VPath, text: string): Promise<void> {
    const { mount, relativePath } = this.locate(desktopId, path)
    if (relativePath === '') throw new AppError('A drive root is not a file.')
    await this.deps.host.writeText(mount.root, relativePath, text)
  }

  async stat(desktopId: Id, path: VPath): Promise<VfsEntryDto | null> {
    const { mount, relativePath } = this.locate(desktopId, path)
    if (relativePath === '') return this.entry(this.vpathOf(mount, ''), { name: `${mount.letter}:`, isDirectory: true, size: null, modifiedAt: null })
    const found = await this.deps.host.stat(mount.root, relativePath)
    return found ? this.entry(this.vpathOf(mount, relativePath), found) : null
  }

  // ---- the system disk -----------------------------------------------------------------------------

  /** Creates C: with Users\Agent\{Desktop,Documents,Downloads} and Temp. Idempotent. */
  async seedSystemDisk(desktopId: Id): Promise<void> {
    const root = this.systemRoot(desktopId)
    await this.deps.host.ensureDirectory(root)
    for (const seed of SYSTEM_SEED_DIRS) await this.deps.host.ensureDirectory(join(root, ...(parseVPath(seed)?.segments ?? [])))
  }

  /** Deletes the desktop's whole `<userData>/desktops/<id>` folder (C: and the thumbnail). */
  async deleteDesktopFolder(desktopId: Id): Promise<void> {
    await this.deps.host.removeTree(join(this.deps.desktopsDir, String(desktopId)))
  }

  // ---- internals -----------------------------------------------------------------------------------

  private computer(desktopId: Id): VfsEntryDto[] {
    return this.mounts(desktopId).map((m) => ({
      name: `${m.label} (${m.letter}:)`,
      path: this.vpathOf(m, ''),
      kind: 'directory',
      size: null,
      modifiedAt: null
    }))
  }

  private entry(path: VPath, e: HostEntry): VfsEntryDto {
    return { name: e.name || basename(path), path, kind: e.isDirectory ? 'directory' : 'file', size: e.isDirectory ? null : e.size, modifiedAt: e.modifiedAt }
  }
}
