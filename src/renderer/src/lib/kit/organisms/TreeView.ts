import type { IconName } from '../atoms/icons'

export interface TreeNodeData {
  id: string
  text: string
  icon?: IconName
  children?: TreeNodeData[]
  /** Initially expanded (seeds the `expanded` set). */
  expanded?: boolean
  /** Node has children that are not loaded yet; `onexpand` provides them. */
  hasChildren?: boolean
  disabled?: boolean
  /** Bold label (the active item). */
  bold?: boolean
  /** Small coloured suffix after the label (e.g. a modified marker). */
  badge?: string
  /** `data-testid` of the node's row. */
  testid?: string
  /** Tooltip of the row. */
  title?: string
  /** Extra `data-*` attributes of the row (`{ 'data-path': ... }`). */
  attrs?: Record<string, string>
  /** Colours the label and badge (version control states). */
  tone?: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflict'
  /** Strike the label through (deleted). */
  strike?: boolean
  /** A small dot after the label: something below this node changed. */
  dot?: boolean
  /** A small pencil after the label: the agent changed this. */
  marker?: boolean
}

export interface FlatNode {
  node: TreeNodeData
  level: number
  parentId: string | null
  hasChildren: boolean
  expanded: boolean
  setSize: number
  posInSet: number
  /** Per ancestor level: do its connector lines continue past this row? */
  ancestors: boolean[]
  last: boolean
  /** "Loading..." pseudo row under a node whose children are being fetched. */
  placeholder?: boolean
}

export interface FlattenContext {
  expanded: ReadonlySet<string>
  childrenOf: (node: TreeNodeData) => TreeNodeData[] | undefined
  isLoading: (node: TreeNodeData) => boolean
}

/** Visible rows of the tree in display order. */
export function flatten(nodes: TreeNodeData[], ctx: FlattenContext): FlatNode[] {
  const out: FlatNode[] = []
  const walk = (list: TreeNodeData[], level: number, parentId: string | null, ancestors: boolean[]): void => {
    list.forEach((node, i) => {
      const kids = ctx.childrenOf(node)
      const hasChildren = kids ? kids.length > 0 : !!node.hasChildren
      const expanded = hasChildren && ctx.expanded.has(node.id)
      const last = i === list.length - 1
      out.push({ node, level, parentId, hasChildren, expanded, setSize: list.length, posInSet: i + 1, ancestors, last })
      if (!expanded) return
      if (kids) walk(kids, level + 1, node.id, [...ancestors, !last])
      else if (ctx.isLoading(node)) {
        const placeholder: TreeNodeData = { id: `${node.id}::loading`, text: 'Loading...', disabled: true }
        out.push({ node: placeholder, level: level + 1, parentId: node.id, hasChildren: false, expanded: false, setSize: 1, posInSet: 1, ancestors: [...ancestors, !last], last: true, placeholder: true })
      }
    })
  }
  walk(nodes, 0, null, [])
  return out
}

/** Ids of every initially expanded node (`TreeNodeData.expanded`). */
export function initiallyExpanded(nodes: TreeNodeData[]): string[] {
  return nodes.flatMap((n) => [...(n.expanded ? [n.id] : []), ...initiallyExpanded(n.children ?? [])])
}
