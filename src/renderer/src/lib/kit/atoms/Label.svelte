<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    text?: string
    /** Id of the control this label describes. */
    for?: string
    disabled?: boolean
    /** Truncate with an ellipsis instead of wrapping (AutoEllipsis). */
    autoEllipsis?: boolean
    class?: string
    children?: Snippet
  }

  let {
    text,
    for: forId,
    disabled = false,
    autoEllipsis = false,
    class: className = '',
    children
  }: Props = $props()
</script>

<label
  class="xp-label {className}"
  class:disabled
  class:ellipsis={autoEllipsis}
  for={forId}
  title={autoEllipsis ? text : undefined}
>
  {#if children}{@render children()}{:else}{text}{/if}
</label>

<style>
  .xp-label {
    display: inline-block;
    color: var(--w7-text);
    cursor: default;
  }
  .xp-label.disabled {
    color: var(--w7-text-disabled);
  }
  .xp-label.ellipsis {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
</style>
