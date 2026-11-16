import { normaliseVPath, type VfsEntryDto, type VPath } from '@shared/vfs'
import type { TreeNodeData } from '../../kit/organisms/TreeView'

export interface TreeRoot {
  /** The root directory, e.g. `E:\`. */
  path: VPath
  /** Its label, e.g. `claude-code-win (E:)`. */
  name: string
}

export const dirNodeId = (path: VPath): string => `d:${path}`
export const fileNodeId = (path: VPath): string => `f:${path}`

/** Tree nodes for the loaded part of the roots; directories whose listing is missing are lazy (`hasChildren`). */
export function buildFileTree(
  roots: readonly TreeRoot[],
  listings: ReadonlyMap<VPath, VfsEntryDto[]>,
  changedPaths: readonly VPath[]
): TreeNodeData[] {
  const changed = new Set(changedPaths.map((p) => normaliseVPath(p) ?? p))
  const nodesOf = (dir: VPath): TreeNodeData[] | undefined =>
    listings.get(dir)?.map((entry) =>
      entry.kind === 'directory'
        ? { id: dirNodeId(entry.path), testid: 'file-tree-folder', text: entry.name, icon: 'folder' as const, hasChildren: true, children: nodesOf(entry.path) }
        : { id: fileNodeId(entry.path), testid: 'file-tree-file', text: entry.name, icon: 'file' as const, badge: changed.has(entry.path) ? 'M' : undefined }
    )
  return roots.map((root) => ({ id: dirNodeId(root.path), testid: 'file-tree-root', text: root.name, icon: 'folder' as const, hasChildren: true, children: nodesOf(root.path) }))
}

/** The directory of an expandable node id, or null for other ids. */
export const dirOfNode = (id: string): VPath | null => (id.startsWith('d:') ? id.slice(2) : null)

/** The file path of a file node id. */
export const fileOfNode = (id: string): VPath | null => (id.startsWith('f:') ? id.slice(2) : null)
