<script lang="ts">
  import { asBoolean, asEnum, asNodes, asNumber } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()
  const direction = $derived(asEnum(view.flowDirection, ['LeftToRight', 'TopDown'], 'LeftToRight'))
</script>

<div
  class="flow"
  style:flex-direction={direction === 'TopDown' ? 'column' : 'row'}
  style:flex-wrap={asBoolean(view.wrap) ? 'wrap' : 'nowrap'}
  style:gap="{asNumber(view.gap, 6)}px"
  style:align-items={direction === 'TopDown' ? 'flex-start' : 'center'}
>
  {#each asNodes(view.children) as node (node.id)}
    {@render child(node)}
  {/each}
</div>

<style>
  .flow {
    display: flex;
    font: var(--xp-font);
  }
</style>
