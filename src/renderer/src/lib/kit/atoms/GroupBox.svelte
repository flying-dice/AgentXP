<script lang="ts">
  import type { Snippet } from 'svelte'
  type Props = {
    /** `data-testid` of the control (agents and e2e specs find it by this id). */
    testid?: string
    text?: string
    disabled?: boolean
    class?: string
    children?: Snippet
  }
  let { testid, text = '', disabled = false, class: className = '', children }: Props = $props()
</script>

<fieldset data-testid={testid} class="xp-groupbox {className}" class:disabled {disabled}>
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
