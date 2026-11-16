<script lang="ts">
  import { asArray, asNodes, asNumber } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()

  const columns = $derived(Math.max(1, Math.floor(asNumber(view.columns, 1) ?? 1)))
  /** px number -> `Npx`, "50%" -> fractional track, "auto" (or missing) -> auto. */
  const track = (w: unknown): string => {
    if (typeof w === 'number') return `${w}px`
    if (typeof w === 'string' && /^\d+(\.\d+)?%$/.test(w)) return `minmax(0, ${Number.parseFloat(w)}fr)`
    return 'auto'
  }
  const template = $derived(Array.from({ length: columns }, (_, i) => track(asArray(view.columnWidths)[i])).join(' '))
</script>

<div class="table" style:grid-template-columns={template}>
  {#each asNodes(view.children) as node (node.id)}
    {@render child(node)}
  {/each}
</div>

<style>
  .table {
    display: grid;
    gap: 6px;
    align-items: center;
    font: var(--w7-font);
  }
</style>
