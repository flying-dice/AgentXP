import { GIT_STATE_INFO, type GitFileState } from '@shared/git'
import { normaliseVPath, type VfsEntryDto, type VPath } from '@shared/vfs'
import type { TreeNodeData } from '../../kit/organisms/TreeView'

export interface TreeRoot {
  /** The root directory, e.g. `E:\`. */
  path: VPath
  /** Its label, e.g. `claude-code-win (E:)`. */
  name: string
}

/** The row a context menu was opened on: a project root, a folder or a file. */
export interface FileTreeTarget {
  kind: 'project' | 'folder' | 'file'
  path: VPath
}

export const dirNodeId = (path: VPath): string => `d:${path}`
export const fileNodeId = (path: VPath): string => `f:${path}`

/** Git states of files and of the folders above them (`indexGitStatus`). */
export interface TreeGitStates {
  files: ReadonlyMap<VPath, GitFileState>
  dirs: ReadonlyMap<VPath, GitFileState>
}

const itemTestid = 'code-tree-item'

/**
 * Tree nodes for the loaded part of the roots; directories whose listing is missing are lazy (`hasChildren`).
 * Files the agent changed get a pencil marker, files with git changes a status letter and colour, folders with
 * changed descendants a dot.
 */
export function buildFileTree(
  roots: readonly TreeRoot[],
  listings: ReadonlyMap<VPath, VfsEntryDto[]>,
  changedPaths: readonly VPath[],
  git?: TreeGitStates
): TreeNodeData[] {
  const changed = new Set(changedPaths.map((p) => normaliseVPath(p) ?? p))
  const nodesOf = (dir: VPath): TreeNodeData[] | undefined =>
    listings.get(dir)?.map((entry): TreeNodeData => {
      if (entry.kind === 'directory') {
        const dirty = git?.dirs.get(entry.path)
        return {
          id: dirNodeId(entry.path),
          testid: itemTestid,
          text: entry.name,
          icon: 'folder',
          hasChildren: true,
          children: nodesOf(entry.path),
          dot: dirty !== undefined,
          tone: dirty,
          title: dirty ? 'Contains changes' : undefined,
          attrs: { 'data-kind': 'directory', 'data-path': entry.path, 'data-git-status': dirty ? 'dirty' : 'none' }
        }
      }
      const state = git?.files.get(entry.path)
      const info = state ? GIT_STATE_INFO[state] : undefined
      const byAgent = changed.has(entry.path)
      return {
        id: fileNodeId(entry.path),
        testid: itemTestid,
        text: entry.name,
        icon: 'file',
        badge: info?.letter,
        tone: state,
        strike: state === 'deleted',
        marker: byAgent,
        title: [info?.text, byAgent ? 'changed by the agent' : undefined].filter(Boolean).join(', ') || undefined,
        attrs: { 'data-kind': 'file', 'data-path': entry.path, 'data-git-status': state ?? 'none', 'data-agent-changed': String(byAgent) }
      }
    })
  return roots.map((root) => ({ id: dirNodeId(root.path), testid: 'file-tree-root', text: root.name, icon: 'folder' as const, hasChildren: true, children: nodesOf(root.path) }))
}

/** The directory of an expandable node id, or null for other ids. */
export const dirOfNode = (id: string): VPath | null => (id.startsWith('d:') ? id.slice(2) : null)

/** The file path of a file node id. */
export const fileOfNode = (id: string): VPath | null => (id.startsWith('f:') ? id.slice(2) : null)
