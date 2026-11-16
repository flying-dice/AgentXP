<script lang="ts">
  import { untrack } from 'svelte'
  import type { FolderDto, Id, SessionDto } from '@shared/models'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import { buildSessionTree, expandableIds, parseNodeId, sessionNodeId } from './sessionTree'

  interface Props {
    folders: FolderDto[]
    sessions: SessionDto[]
    activeSessionId?: Id | null
    /** Ids of collapsed nodes (everything else starts expanded). */
    collapsed?: string[]
    onselectsession?: (id: Id) => void
    onselectfolder?: (id: Id) => void
    onnewsession?: (folderId: Id) => void
    onrename?: (session: SessionDto) => void
    ondelete?: (session: SessionDto) => void
    onremovefolder?: (folder: FolderDto) => void
  }

  let {
    folders,
    sessions,
    activeSessionId = null,
    collapsed = $bindable([]),
    onselectsession,
    onselectfolder,
    onnewsession,
    onrename,
    ondelete,
    onremovefolder
  }: Props = $props()

  const nodes = $derived(buildSessionTree(folders, sessions, activeSessionId))
  const ids = $derived(expandableIds(nodes))

  let selected = $state<string | null>(null)
  let expanded = $state(new Set<string>())
  const known = new Set<string>()

  // Everything is expanded unless the user collapsed it; nodes that appear later start expanded too.
  $effect(() => {
    const fresh = ids.filter((id) => !known.has(id))
    if (fresh.length === 0) return
    fresh.forEach((id) => known.add(id))
    const open = fresh.filter((id) => !untrack(() => collapsed).includes(id))
    expanded = new Set([...untrack(() => expanded), ...open])
  })

  $effect(() => {
    const all = ids
    const next = all.filter((id) => !expanded.has(id))
    if (next.length !== untrack(() => collapsed).length || next.some((id) => !untrack(() => collapsed).includes(id))) collapsed = next
  })

  $effect(() => {
    if (activeSessionId != null) selected = sessionNodeId(activeSessionId)
  })

  let menuOpen = $state(false)
  let menuX = $state(0)
  let menuY = $state(0)
  let menuItems = $state<MenuItemDef[]>([])

  function showMenu(nodeId: string, event: MouseEvent): void {
    const parsed = parseNodeId(nodeId)
    if (!parsed) return
    event.preventDefault()
    if (parsed.kind === 'folder') {
      const folder = folders.find((f) => f.id === parsed.id)
      if (!folder) return
      menuItems = [
        { label: 'New Session Here', icon: 'new', action: () => onnewsession?.(folder.id) },
        { separator: true },
        { label: 'Remove Folder', icon: 'delete', action: () => onremovefolder?.(folder) }
      ]
    } else {
      const session = sessions.find((s) => s.id === parsed.id)
      if (!session) return
      menuItems = [
        { label: 'New Session Here', icon: 'new', action: () => onnewsession?.(session.folderId) },
        { separator: true },
        { label: 'Rename…', icon: 'edit', action: () => onrename?.(session) },
        { label: 'Delete Session', icon: 'delete', action: () => ondelete?.(session) }
      ]
    }
    menuX = event.clientX
    menuY = event.clientY
    menuOpen = true
  }
</script>

<TreeView
  class="session-tree"
  aria-label="Workspaces"
  {nodes}
  bind:selected
  bind:expanded
  onselect={(node) => {
    const parsed = parseNodeId(node.id)
    if (parsed?.kind === 'session') onselectsession?.(parsed.id)
    else if (parsed?.kind === 'folder') onselectfolder?.(parsed.id)
  }}
  oncontextmenu={(node, event) => showMenu(node.id, event)}
/>
<ContextMenuStrip items={menuItems} bind:open={menuOpen} x={menuX} y={menuY} label="Session actions" />

<style>
  /* The tab page already draws the border. */
  :global(.w7-tree.session-tree.session-tree) {
    flex: 1;
    border: 0;
  }
</style>
