<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import type { VfsEntryDto, VPath } from '@shared/vfs'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import { buildFileTree, dirNodeId, dirOfNode, fileOfNode, type TreeRoot } from '../files/fileTree'

  interface Props {
    /** The root nodes: the plugged-in project drives. */
    roots: TreeRoot[]
    /** Lists one directory (a VPath). */
    readDir: (path: VPath) => Promise<VfsEntryDto[]>
    /** VPaths of files the agent changed; they get an "M" badge. */
    changedPaths?: VPath[]
    /** Double click or Enter on a file. */
    onopen?: (path: VPath) => void
    onerror?: (error: unknown) => void
  }

  let { roots, readDir, changedPaths = [], onopen, onerror }: Props = $props()

  const listings = new SvelteMap<VPath, VfsEntryDto[]>()
  const requested = new Set<VPath>()
  // svelte-ignore state_referenced_locally
  let expanded = $state(new Set<string>(roots.map((r) => dirNodeId(r.path))))
  let selected = $state<string | null>(null)

  const nodes = $derived(buildFileTree(roots, listings, changedPaths))

  // Load the listing of every expanded directory that has none yet.
  $effect(() => {
    for (const id of expanded) {
      const dir = dirOfNode(id)
      if (dir === null || requested.has(dir)) continue
      requested.add(dir)
      untrack(() => {
        readDir(dir).then(
          (entries) => listings.set(dir, entries),
          (error: unknown) => {
            listings.set(dir, [])
            onerror?.(error)
          }
        )
      })
    }
  })
</script>

<TreeView
  class="file-tree"
  testid="file-tree"
  aria-label="Files"
  {nodes}
  bind:selected
  bind:expanded
  onactivate={(node) => {
    const file = fileOfNode(node.id)
    if (file !== null) onopen?.(file)
  }}
/>

<style>
  :global(.w7-tree.file-tree.file-tree) {
    flex: 1;
    border: 0;
  }
</style>
