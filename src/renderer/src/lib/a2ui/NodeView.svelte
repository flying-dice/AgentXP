<script lang="ts">
  import type { ComponentNode } from '@a2ui/web_core/v0_9'
  import NodeView from './NodeView.svelte'
  import UnknownComponent from './components/UnknownComponent.svelte'
  import { lookupComponent } from './registry'
  import { useSignal } from './signals.svelte'
  import { toViewProps } from './viewProps'

  /** Renders one node of the resolved tree with its catalog wrapper, recursing through `child`. */
  let { node }: { node: ComponentNode } = $props()

  const nodeProps = useSignal(() => node.props)
  const view = $derived(toViewProps(nodeProps.current))
  const Wrapper = $derived(node.state === 'resolved' ? lookupComponent(node.type) : undefined)
</script>

{#snippet child(next: ComponentNode)}
  <NodeView node={next} />
{/snippet}

{#if node.state === 'unknown-type'}
  <UnknownComponent name={node.type} />
{:else if node.state === 'cyclic'}
  <UnknownComponent name={node.componentId} reason="refers to its own parent" />
{:else if node.state === 'resolved'}
  {#if Wrapper}
    <Wrapper {node} {view} {child} />
  {:else}
    <UnknownComponent name={node.type} />
  {/if}
{/if}
