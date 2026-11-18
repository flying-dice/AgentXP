<script lang="ts">
  import type { Snippet } from 'svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import ToolStatusIcon from './ToolStatusIcon.svelte'
  import { SHOW_EVENT_LABEL, offersEventLink, type ToolStatusView } from './toolStatus'
  import type { ToolShowTarget } from '@shared/toolShowTarget'

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
    /** "Show in Event Viewer": opens the viewer on the event of this step; shown under a failed step. */
    onshowevent?: () => void
    /** "Show in Code", "Show diff", "Show in Terminal", "Show in Browser": where the step can be seen (`toolShowTargets`); shown while it runs and when it is done. */
    showActions?: readonly { kind: ToolShowTarget['kind']; label: string; run: () => void }[]
    /** The card belongs to an earlier step: a separator line "Earlier step" comes first. */
    earlier?: boolean
    /** The body (result, diff, console). */
    children?: Snippet
  }

  let { name, argument, status, expandable = false, open = false, onopenchange, note, onshowevent, showActions = [], earlier = false, children }: Props = $props()
  const showsPlace = $derived(showActions.length > 0 && (status.kind === 'done' || status.kind === 'running'))
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
  {#if onshowevent && offersEventLink(status.kind)}
    <div class="note"><button type="button" class="link" data-testid="tool-call-show-event" onclick={onshowevent}>{SHOW_EVENT_LABEL}</button></div>
  {/if}
  {#if showsPlace}
    <div class="note actions">{#each showActions as action, i (action.kind)}{#if i > 0}<span class="sep" aria-hidden="true">|</span>{/if}<button type="button" class="link" data-testid="tool-call-show-{action.kind}" onclick={action.run}>{action.label}</button>{/each}</div>
  {/if}
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
    font: var(--xp-font-mono);
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
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--xp-link, #0066cc);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 6px;
  }
  .sep {
    color: #8a96a8;
  }
  .earlier {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0;
    color: var(--xp-text-muted);
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
