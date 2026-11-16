<script lang="ts">
  import type { Snippet } from 'svelte'
  type Props = {
    text?: string
    disabled?: boolean
    class?: string
    children?: Snippet
  }
  let { text = '', disabled = false, class: className = '', children }: Props = $props()
</script>

<fieldset class="xp-groupbox {className}" class:disabled {disabled}>
  {#if text}<legend>{text}</legend>{/if}
  {@render children?.()}
</fieldset>

<style>
  .xp-groupbox {
    margin: 0;
    padding: 6px 9px 9px;
    min-width: 0;
    border: 1px solid var(--w7-group-border);
    border-radius: 3px;
    box-shadow: inset 1px 1px 0 #fff, 1px 1px 0 #fff;
    font: var(--w7-font);
    color: var(--w7-text);
  }
  legend {
    padding: 0 3px;
    margin-left: 6px;
  }
  .disabled {
    color: var(--w7-text-disabled);
  }
</style>
