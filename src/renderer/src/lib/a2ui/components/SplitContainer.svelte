<script lang="ts">
  import KitSplitContainer from '$lib/kit/organisms/SplitContainer.svelte'
  import { asEnum, asNode, asNumber } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()

  // WinForms Orientation.Vertical puts the panels side by side, which is the kit's `vertical`.
  const orientation = $derived(asEnum(view.orientation, ['Horizontal', 'Vertical'], 'Vertical') === 'Vertical' ? 'vertical' : 'horizontal')
  let distance = $derived(asNumber(view.splitterDistance, 200) ?? 200)
  const panel1 = $derived(asNode(view.panel1))
  const panel2 = $derived(asNode(view.panel2))
</script>

{#snippet pane(node: typeof panel1)}
  <div class="pane">
    {#if node}
      {#key node.id}
        {@render child(node)}
      {/key}
    {/if}
  </div>
{/snippet}

<div class="split">
  <KitSplitContainer {orientation} bind:splitterDistance={distance} panel1={() => pane(panel1)} panel2={() => pane(panel2)} />
</div>

<style>
  .split {
    min-height: 150px;
    display: flex;
    border: 1px solid var(--w7-panel-border);
    background: var(--w7-face);
  }
  .pane {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
