<script lang="ts">
  import type { Snippet } from 'svelte'
  import { rovingFocus } from '../actions/rovingFocus'

  interface Props {
    /** Items (ToolStripButton, Separator, ToolStripDropDownButton) laid out from the left. */
    children: Snippet
    /** Items pushed to the right edge (the "spring" of the strip). */
    trailing?: Snippet
    class?: string
    'aria-label'?: string
  }

  let { children, trailing, class: className = '', 'aria-label': ariaLabel = 'Tools' }: Props = $props()
</script>

<div
  class="xp-toolstrip {className}"
  role="toolbar"
  aria-label={ariaLabel}
  use:rovingFocus={{ selector: 'button:not(:disabled)', loop: false }}
>
  {@render children()}
  {#if trailing}
    <span class="spring"></span>
    {@render trailing()}
  {/if}
</div>

<style>
  .xp-toolstrip {
    flex: none;
    display: flex;
    align-items: center;
    gap: 1px;
    height: 34px;
    padding: 0 4px;
    background: linear-gradient(#fff, #d6dff7);
    border-bottom: 1px solid #aab7cb;
  }
  .spring {
    flex: 1;
  }
</style>
