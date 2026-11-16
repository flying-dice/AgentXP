import type { FolderDto, Id, SessionDto } from '@shared/models'
import type { TreeNodeData } from '../../kit/organisms/TreeView'

export const WORKSPACES_NODE = 'workspaces'
export const folderNodeId = (id: Id): string => `f:${id}`
export const sessionNodeId = (id: Id): string => `s:${id}`

export interface ParsedNodeId {
  kind: 'folder' | 'session'
  id: Id
}

export function parseNodeId(nodeId: string): ParsedNodeId | null {
  const match = /^([fs]):(\d+)$/.exec(nodeId)
  return match ? { kind: match[1] === 'f' ? 'folder' : 'session', id: Number(match[2]) } : null
}

/** "Workspaces" > folders > sessions; the active session is bold. */
export function buildSessionTree(folders: FolderDto[], sessions: SessionDto[], activeId: Id | null): TreeNodeData[] {
  return [
    {
      id: WORKSPACES_NODE,
      text: 'Workspaces',
      icon: 'folder',
      children: folders.map((folder) => ({
        id: folderNodeId(folder.id),
        text: folder.name,
        icon: 'folder',
        children: sessions
          .filter((s) => s.folderId === folder.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
          .map((s) => ({ id: sessionNodeId(s.id), text: s.title || 'New session', icon: 'session' as const, bold: s.id === activeId }))
      }))
    }
  ]
}

/** Ids of all nodes that can be expanded. */
export const expandableIds = (nodes: TreeNodeData[]): string[] =>
  nodes.flatMap((n) => (n.children ? [n.id, ...expandableIds(n.children)] : []))
