<script lang="ts">
  import KitPanel from '$lib/kit/atoms/Panel.svelte'
  import { asBoolean, asEnum, asNodes } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()
  const border = $derived(asEnum(view.borderStyle, ['None', 'FixedSingle', 'Fixed3D'], 'None'))
</script>

<KitPanel borderStyle={border} autoScroll={asBoolean(view.autoScroll)} class="a2ui-stack {border === 'None' ? '' : 'padded'}">
  {#each asNodes(view.children) as node (node.id)}
    {@render child(node)}
  {/each}
</KitPanel>

<style>
  :global(.a2ui-stack) {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  :global(.a2ui-stack.padded) {
    padding: 6px;
  }
</style>
