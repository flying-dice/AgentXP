<script lang="ts">
  import type { Snippet } from 'svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import ToolStatusIcon from './ToolStatusIcon.svelte'
  import type { ToolStatusView } from './toolStatus'

  interface Props {
    /** Bold tool name: Read, Edit, Bash... */
    name: string
    /** One-line argument (path, command, pattern). */
    argument: string
    status: ToolStatusView
    /** Whether there is a body to show; enables the Show/Hide button. */
    expandable?: boolean
    open?: boolean
    onopenchange?: (open: boolean) => void
    /** A line under the head (the explanation of "Denied by you"). */
    note?: string
    /** The card belongs to an earlier step: a separator line "Earlier step" comes first. */
    earlier?: boolean
    /** The body (result, diff, console). */
    children?: Snippet
  }

  let { name, argument, status, expandable = false, open = false, onopenchange, note, earlier = false, children }: Props = $props()
</script>

{#if earlier}<div class="earlier" data-testid="tool-call-earlier">Earlier step</div>{/if}
<div class="tool-card" data-testid="tool-call-card" data-status={status.kind}>
  <div class="head">
    <ToolStatusIcon kind={status.kind} label={status.label} />
    <span class="name">{name}</span>
    <span class="arg" title={argument}>{argument}</span>
    <span class="state">{status.label}</span>
    {#if expandable}
      <Button class="toggle" data-testid="tool-call-toggle" aria-expanded={open} onclick={() => onopenchange?.(!open)}>{open ? 'Hide' : 'Show'}</Button>
    {/if}
  </div>
  {#if note}<div class="note" data-testid="tool-call-note">{note}</div>{/if}
  {#if expandable && open}<div class="body">{@render children?.()}</div>{/if}
</div>

<style>
  .tool-card {
    border: 1px solid #c5d1e1;
    border-radius: 3px;
    background: #f7f9fc;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 26px;
    padding: 3px 7px;
  }
  .name {
    font-weight: 700;
  }
  .arg {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: var(--w7-font-mono);
    color: #222;
  }
  .state {
    white-space: nowrap;
    color: #444;
  }
  .head :global(.toggle) {
    min-width: 0;
    height: 19px;
    padding: 0 7px;
  }
  .note {
    padding: 0 7px 4px 30px;
    color: #444;
  }
  .earlier {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0;
    color: var(--w7-text-muted);
    font-size: 11px;
  }
  .earlier::before,
  .earlier::after {
    content: '';
    flex: 1;
    border-top: 1px solid #c5d1e1;
  }
  .body {
    border-top: 1px solid #c5d1e1;
  }
</style>
