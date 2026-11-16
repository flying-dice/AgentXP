<script lang="ts">
  import type { ComponentNode } from '@a2ui/web_core/v0_9'
  import KitTabControl from '$lib/kit/organisms/TabControl.svelte'
  import { asArray, asNode, asRecord, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()

  const tabs = $derived(
    asArray(view.tabs).map((t, i): { id: string; title: string; page: ComponentNode | undefined } => ({
      id: String(i),
      title: asString(asRecord(t).title),
      page: asNode(asRecord(t).child)
    }))
  )
  let selected = $state('0')
</script>

<KitTabControl {tabs} bind:selected>
  {#snippet panel(tab)}
    <div class="page">
      {#if tab.page}
        {#key tab.page.id}
          {@render child(tab.page)}
        {/key}
      {/if}
    </div>
  {/snippet}
</KitTabControl>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
  }
</style>
