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
    border: 1px solid var(--xp-group-border);
    border-radius: 4px;
    font: var(--xp-font);
    color: var(--xp-text);
  }
  legend {
    color: var(--xp-group-title);
    padding: 0 3px;
    margin-left: 6px;
  }
  .disabled {
    color: var(--xp-text-disabled);
  }
</style>
