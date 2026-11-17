<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    /** StatusStripLabel / ProgressBar items. */
    children: Snippet
    /** Show the resize grip at the right end (SizingGrip). */
    sizeGrip?: boolean
    class?: string
    /** `data-testid` of the strip (agents and e2e specs find it by this id). Default `status-strip`: one per window, so a spec scopes it by the window. */
    testid?: string
  }

  let { children, sizeGrip = true, class: className = '', testid = 'status-strip' }: Props = $props()
</script>

<div class="xp-statusstrip {className}" data-testid={testid} role="status">
  {@render children()}
  {#if sizeGrip}
    <svg class="grip" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <g stroke="#9a9a9a" stroke-width="2"><line x1="14" y1="4" x2="4" y2="14" /><line x1="14" y1="8" x2="8" y2="14" /><line x1="14" y1="12" x2="12" y2="14" /></g>
    </svg>
  {/if}
</div>

<style>
  .xp-statusstrip {
    flex: none;
    display: flex;
    align-items: center;
    height: 24px;
    min-width: 0;
    overflow: hidden;
    background: linear-gradient(#f5f7fa, #dbe4f1);
    border-top: 1px solid #a9b6c9;
  }
  .grip {
    flex: none;
    margin: 0 2px 0 4px;
  }
</style>
