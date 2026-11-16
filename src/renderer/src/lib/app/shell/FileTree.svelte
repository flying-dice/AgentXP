<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import type { FileNodeDto } from '@shared/models'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import { buildFileTree, dirOfNode, fileOfNode, ROOT_NODE } from '../files/fileTree'

  interface Props {
    /** Name of the root node (the folder's name). */
    rootName: string
    /** Lists one directory level below the folder (`''` is the folder itself). */
    readDir: (relativePath: string) => Promise<FileNodeDto[]>
    /** Relative paths of files the agent changed in this session; they get an "M" badge. */
    changedPaths?: string[]
    /** Double click or Enter on a file. */
    onopen?: (relativePath: string) => void
    onerror?: (error: unknown) => void
  }

  let { rootName, readDir, changedPaths = [], onopen, onerror }: Props = $props()

  const listings = new SvelteMap<string, FileNodeDto[]>()
  const requested = new Set<string>()
  let expanded = $state(new Set<string>([ROOT_NODE]))
  let selected = $state<string | null>(null)

  const nodes = $derived(buildFileTree(rootName, listings, changedPaths))

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
