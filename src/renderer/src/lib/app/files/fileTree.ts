import type { FileNodeDto } from '@shared/models'
import type { TreeNodeData } from '../../kit/organisms/TreeView'

export const ROOT_NODE = 'root'
export const dirNodeId = (path: string): string => `d:${path}`
export const fileNodeId = (path: string): string => `f:${path}`

const normalize = (path: string): string => path.replaceAll('\\', '/')

/** Tree nodes for the loaded part of a folder; directories whose listing is missing are lazy (`hasChildren`). */
export function buildFileTree(
  rootName: string,
  listings: ReadonlyMap<string, FileNodeDto[]>,
  changedPaths: readonly string[]
): TreeNodeData[] {
  const changed = new Set(changedPaths.map(normalize))
  const nodesOf = (dir: string): TreeNodeData[] | undefined =>
    listings.get(dir)?.map((entry) =>
      entry.isDirectory
        ? { id: dirNodeId(entry.path), text: entry.name, icon: 'folder' as const, hasChildren: true, children: nodesOf(entry.path) }
        : {
            id: fileNodeId(entry.path),
            text: entry.name,
            icon: 'file' as const,
            badge: changed.has(normalize(entry.path)) ? 'M' : undefined
          }
    )
  return [{ id: ROOT_NODE, text: rootName, icon: 'folder', hasChildren: true, children: nodesOf('') }]
}

/** The relative directory of an expandable node id (`''` for the root), or null for other ids. */
export function dirOfNode(id: string): string | null {
  if (id === ROOT_NODE) return ''
  return id.startsWith('d:') ? id.slice(2) : null
}

/** The relative file path of a file node id. */
export const fileOfNode = (id: string): string | null => (id.startsWith('f:') ? id.slice(2) : null)
