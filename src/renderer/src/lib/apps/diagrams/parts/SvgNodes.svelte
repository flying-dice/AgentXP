<script lang="ts">
  /** Renders a stencil's SVG node tree (the same tree the export turns into markup). */
  import type { SvgNode } from '../model/svg'
  import Self from './SvgNodes.svelte'

  let { nodes }: { nodes: SvgNode[] } = $props()
</script>

{#each nodes as node, i (i)}
  {#if node.tag === 'text' || node.tag === 'tspan'}
    <svelte:element this={node.tag} xmlns="http://www.w3.org/2000/svg" {...node.attrs}>{#if node.children}<Self nodes={node.children} />{:else}{node.text ?? ''}{/if}</svelte:element>
  {:else}
    <svelte:element this={node.tag} xmlns="http://www.w3.org/2000/svg" {...node.attrs}>{#if node.children}<Self nodes={node.children} />{/if}</svelte:element>
  {/if}
{/each}
