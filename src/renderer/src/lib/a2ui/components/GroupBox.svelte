<script lang="ts">
  import KitGroupBox from '$lib/kit/atoms/GroupBox.svelte'
  import { asNodes, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view, child }: A2uiComponentProps = $props()
</script>

<KitGroupBox text={asString(view.text)} class="a2ui-stack">
  {#each asNodes(view.children) as node (node.id)}
    {@render child(node)}
  {/each}
</KitGroupBox>
