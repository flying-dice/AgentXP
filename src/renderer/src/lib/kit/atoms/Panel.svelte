<script lang="ts">
  import type { Snippet } from 'svelte'
  type Props = {
    borderStyle?: 'None' | 'FixedSingle' | 'Fixed3D'
    autoScroll?: boolean
    class?: string
    style?: string
    children?: Snippet
  }
  let {
    borderStyle = 'None',
    autoScroll = false,
    class: className = '',
    style = '',
    children
  }: Props = $props()
</script>

<div
  class="xp-panel {borderStyle} {className}"
  class:xp-scroll={autoScroll}
  class:clip={!autoScroll}
  {style}
>
  {@render children?.()}
</div>

<style>
  .xp-panel {
    position: relative;
    background: var(--xp-face);
    font: var(--xp-font);
    color: var(--xp-text);
  }
  .clip {
    overflow: hidden;
  }
  .FixedSingle {
    border: 1px solid var(--xp-panel-border);
  }
  .Fixed3D {
    border: 2px solid;
    border-color: #a0a0a0 #fff #fff #a0a0a0;
    box-shadow: inset 1px 1px 0 #696969, inset -1px -1px 0 #e3e3e3;
  }
</style>
