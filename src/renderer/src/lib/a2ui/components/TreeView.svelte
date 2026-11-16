<script lang="ts">
  import KitTreeView from '$lib/kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '$lib/kit/organisms/TreeView'
  import { asArray, asRecord, asString, setterOf } from '../viewProps'
  import { toIcon } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const toNodes = (value: unknown): TreeNodeData[] =>
    asArray(value).map((raw) => {
      const r = asRecord(raw)
      return { id: asString(r.id), text: asString(r.text), icon: toIcon(r.icon), children: r.children === undefined ? undefined : toNodes(r.children) }
    })
  const nodes = $derived(toNodes(view.nodes))
  let selected = $derived(asString(view.selected) || null)
</script>

<div class="tree">
  <KitTreeView
    {nodes}
    bind:selected={
      () => selected,
      (id) => {
        selected = id
        setterOf(view, 'selected')(id ?? '')
      }
    }
  />
</div>

<style>
  .tree {
    display: flex;
    height: 160px;
  }
  .tree :global(.w7-tree) {
    flex: 1;
  }
</style>
