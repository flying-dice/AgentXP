<script lang="ts">
  /** The folded work of a turn: one "Thinking" line (what the agent did on the way to its answer) with the rows inside. */
  import type { Snippet } from 'svelte'
  import Spinner from '../../kit/atoms/Spinner.svelte'

  interface Props {
    summary: string
    /** A second, muted line under the summary ("First: ... Last: ..."); the Browser's steps in plain words. */
    detail?: string | null
    /** The tooltip of the summary line (the Browser's counts per kind). */
    tooltip?: string | null
    /** The turn is still working on this group. */
    live?: boolean
    open?: boolean
    children: Snippet
  }

  let { summary, detail = null, tooltip = null, live = false, open = $bindable(false), children }: Props = $props()
</script>

<div class="activity" data-testid="chat-activity-group" data-open={open} data-live={live}>
  <button class="toggle" type="button" data-testid="chat-activity-toggle" aria-expanded={open} title={tooltip ?? undefined} onclick={() => (open = !open)}>
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
      {#if open}
        <path d="M8.5 2L8.5 8.5L2 8.5z" fill="#404040" stroke="#404040" />
      {:else}
        <path d="M3 1.5L7 5L3 8.5z" fill="#fff" stroke="#6e6e6e" />
      {/if}
    </svg>
    {#if live}<Spinner size={12} label="Working" />{/if}
    <span>{summary}</span>
  </button>
  {#if detail}<div class="detail" data-testid="chat-activity-detail">{detail}</div>{/if}
  {#if open}<div class="inside">{@render children()}</div>{/if}
</div>

<style>
  .activity {
    color: var(--w7-text-muted);
  }
  .detail {
    margin: 2px 0 0 14px;
    font-size: 11px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    padding: 1px 3px;
    border: 1px solid transparent;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
  }
  .toggle:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .toggle:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .inside {
    margin: 4px 0 0 8px;
    padding-left: 8px;
    border-left: 1px solid var(--w7-panel-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: initial;
  }
</style>
