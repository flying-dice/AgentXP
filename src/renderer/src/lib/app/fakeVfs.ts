/**
 * In-memory virtual file system, drives and launcher for Storybook and tests: a private `C:` disk
 * and projects plugged in as removable USB drives, like VfsService / DriveService in main.
 */
import type { Id } from '@shared/models'
import {
  SYSTEM_SEED_DIRS,
  SYSTEM_DRIVE,
  formatVPath,
  joinVPath,
  nextDriveLetter,
  noDriveMessage,
  parseVPath,
  vpathName,
  type DriveDto,
  type DriveLetter,
  type DrivesApi,
  type VPath,
  type VfsApi,
  type VfsEntryDto
} from '@shared/vfs'
import type { FolderDto } from '@shared/models'

interface DirNode {
  kind: 'directory'
  children: Map<string, Node>
}
interface FileNode {
  kind: 'file'
  text: string
  modifiedAt: string
}
type Node = DirNode | FileNode

const dir = (): DirNode => ({ kind: 'directory', children: new Map() })
const STAMP = '2026-11-16T09:12:00Z'

export const systemDrive = (): DriveDto => ({ letter: SYSTEM_DRIVE, label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null })
export const usbDrive = (letter: DriveLetter, folder: Pick<FolderDto, 'id' | 'name'>, pluggedAt = '2026-11-16T09:00:00Z'): DriveDto => ({
  letter,
  label: folder.name,
  kind: 'removable',
  folderId: folder.id,
  pluggedAt
})

export interface FakeVfsOptions {
  /** Called after plug in / eject with the new drive list. */
  onDrives?: (drives: DriveDto[]) => void
  /** Resolves the folder to plug in: the given id, or "the picker's answer" (null = cancelled). */
  resolveFolder: (folderId?: Id) => FolderDto | null
  /** Files of a project drive, relative to its root. */
  filesOf: (folder: FolderDto) => Record<string, string>
}

export interface FakeVfs {
  vfs: VfsApi
  drives: DrivesApi
  list(): DriveDto[]
  /** Plugs a folder in without events (initial state). */
  mount(folder: FolderDto, letter?: DriveLetter): DriveDto
}

export function createFakeVfs(options: FakeVfsOptions): FakeVfs {
  const roots = new Map<DriveLetter, DirNode>()
  let drives: DriveDto[] = [systemDrive()]
  roots.set(SYSTEM_DRIVE, dir())

  const walk = (path: VPath, create = false): Node => {
    const p = parseVPath(path)
    if (!p) throw new Error(`The path '${path}' is not valid.`)
    const root = roots.get(p.drive)
    if (!root) throw new Error(noDriveMessage(p.drive))
    let node: Node = root
    for (const segment of p.segments) {
      if (node.kind !== 'directory') throw new Error(`Cannot find '${path}'.`)
      let next: Node | undefined = node.children.get(segment)
      if (!next) {
        if (!create) throw new Error(`Cannot find '${path}'.`)
        next = dir()
        node.children.set(segment, next)
      }
      node = next
    }
    return node
  }

  const put = (path: VPath, text: string): void => {
    const p = parseVPath(path)!
    const name = p.segments.at(-1)!
    const parent = walk(formatVPath({ drive: p.drive, segments: p.segments.slice(0, -1) }), true)
    if (parent.kind !== 'directory') throw new Error(`Cannot create '${path}'.`)
    parent.children.set(name, { kind: 'file', text, modifiedAt: STAMP })
  }

  for (const seed of SYSTEM_SEED_DIRS) walk(seed, true)
  put('C:\\Users\\Agent\\Documents\\notes.txt', 'Ideas for the next run:\n- ask the agent to add tests for parseRedirect\n')
  put('C:\\Users\\Agent\\Desktop\\todo.txt', 'Review the login redirect change\n')
  put('C:\\Users\\Agent\\Downloads\\readme-draft.md', '# Draft\n\nNothing here yet.\n')

  const entryOf = (path: VPath, node: Node): VfsEntryDto => ({
    name: vpathName(path),
    path,
    kind: node.kind,
    size: node.kind === 'file' ? node.text.length : null,
    modifiedAt: node.kind === 'file' ? node.modifiedAt : STAMP
  })

  const publish = (): void => options.onDrives?.([...drives])

  const mount = (folder: FolderDto, letter?: DriveLetter): DriveDto => {
    const l = letter ?? nextDriveLetter(drives.map((d) => d.letter))
    if (!l) throw new Error('No drive letter is free.')
    const drive = usbDrive(l, folder)
    drives = [...drives, drive]
    roots.set(l, dir())
    for (const [rel, text] of Object.entries(options.filesOf(folder))) put(`${l}:\\${rel.replaceAll('/', '\\')}`, text)
    return drive
  }

  return {
    list: () => [...drives],
    mount,
    vfs: {
      readDir: async (_desktop, path) => {
        const node = walk(path)
        if (node.kind !== 'directory') throw new Error(`'${path}' is not a folder.`)
        return [...node.children.entries()]
          .map(([name, child]) => entryOf(joinVPath(path, name)!, child))
          .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1))
      },
      readFile: async (_desktop, path) => {
        const node = walk(path)
        if (node.kind !== 'file') throw new Error(`'${path}' is a folder.`)
        return node.text
      },
      writeFile: async (_desktop, path, text) => put(path, text),
      // Bytes are kept as a latin1 string: one character per byte.
      readBytes: async (_desktop, path) => {
        const node = walk(path)
        if (node.kind !== 'file') throw new Error(`'${path}' is a folder.`)
        return Uint8Array.from(node.text, (c) => c.charCodeAt(0) & 0xff)
      },
      writeBytes: async (_desktop, path, bytes) => put(path, new TextDecoder('latin1').decode(bytes)),
      stat: async (_desktop, path) => {
        try {
          return entryOf(path, walk(path))
        } catch {
          return null
        }
      }
    },
    drives: {
      list: async () => [...drives],
      plugIn: async (_desktop, folderId) => {
        const folder = options.resolveFolder(folderId)
        if (!folder) return null
        const existing = drives.find((d) => d.folderId === folder.id)
        if (existing) return existing
        const drive = mount(folder)
        publish()
        return drive
      },
      eject: async (_desktop, letter) => {
        const l = letter.toUpperCase()
        if (l === SYSTEM_DRIVE) throw new Error('The system disk cannot be removed.')
        drives = drives.filter((d) => d.letter !== l)
        roots.delete(l)
        publish()
      }
    }
  }
}
