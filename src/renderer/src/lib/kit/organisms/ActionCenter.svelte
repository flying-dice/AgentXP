<script module lang="ts">
  export interface ActionCenterApproval {
    key: string
    /** What the agent wants to do: "Change src/auth/redirect.ts". */
    title: string
    /** Which chat asked: "In chat 'Fix the login...' (started 10:42)". */
    detail?: string
  }
  export interface ActionCenterMessage {
    id: number
    text: string
    /** A bold line above the text (a notice's title: "New review comments"). */
    title?: string
    /** The agent it is about: its colour swatch beside the title (the name is in the text). */
    identity?: { name: string; color: string }
    /** When it came ("10:42"). */
    time?: string
    /** Buttons under the text ("Open review", "Continue"); `onaction` gets the message id and the action id. */
    actions?: { id: string; label: string }[]
  }
</script>

<script lang="ts">
  import Button from '../atoms/Button.svelte'
  import { clickOutside } from '../actions/clickOutside'

  interface Props {
    approvals?: ActionCenterApproval[]
    messages?: ActionCenterMessage[]
    onreview?: (key: string) => void
    /** A button of a message: the message id and the action id. */
    onaction?: (messageId: number, actionId: string) => void
    onopencontrolcentre?: () => void
    /** "Open Event Viewer": the list of what happened. */
    onopeneventviewer?: () => void
    onclose?: () => void
    /** Tray button element: presses on it are not "outside". */
    ignore?: HTMLElement | null
    /** "2 things to look at": shows that wait their turn and show requests nobody answered (null: none). */
    toLook?: string | null
  }

  let { approvals = [], messages = [], onreview, onaction, onopencontrolcentre, onopeneventviewer, onclose, ignore = null, toLook = null }: Props = $props()
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="xp-action-center"
  data-testid="action-center"
  role="dialog"
  tabindex="-1"
  aria-label="Action Center"
  use:clickOutside={{ handler: () => onclose?.(), ignore }}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onclose?.()
    }
  }}
>
  <div class="head">Action Center</div>
  <section>
    <h4>{approvals.length > 0 ? `Waiting for your approval (${approvals.length})` : 'Nothing is waiting for your approval'}</h4>
    {#each approvals as a (a.key)}
      <div class="row" data-testid="action-center-approval">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.5 17 4v5.5c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.600-7-9V4z" fill="#f2c230" stroke="#9a6e00" />
          <path d="M10 5.5v5M10 12.5v1.6" stroke="#5a3d00" stroke-width="1.8" />
        </svg>
        <div class="what">
          <div class="title" data-testid="action-center-approval-title" title={a.title}>{a.title}</div>
          {#if a.detail}<div class="detail" data-testid="action-center-approval-chat" title={a.detail}>{a.detail}</div>{/if}
        </div>
        <Button data-testid="action-center-review" onclick={() => onreview?.(a.key)}>Review</Button>
      </div>
    {/each}
  </section>
  <section>
    <h4>Messages</h4>
    {#if toLook}<div class="look" data-testid="action-center-shows">{toLook}</div>{/if}
    {#each messages as m (m.id)}
      <div class="message" data-testid="action-center-message" data-agent={m.identity?.name}>
        <div class="body">
          {#if m.title}
            <div class="mtitle">
              {#if m.identity}<span class="swatch" data-testid="action-center-message-agent" title={m.identity.name} style:background={m.identity.color} aria-hidden="true"></span>{/if}
              <b data-testid="action-center-message-title">{m.title}</b>
              {#if m.time}<span class="time">{m.time}</span>{/if}
            </div>
          {/if}
          <p data-testid="action-center-message-text">{m.text}</p>
        </div>
        {#each m.actions ?? [] as a (a.id)}
          <Button data-testid="action-center-message-action" data-action={a.id} onclick={() => onaction?.(m.id, a.id)}>{a.label}</Button>
        {/each}
      </div>
    {:else}
      <p class="quiet">No new messages.</p>
    {/each}
  </section>
  <div class="foot">
    <button type="button" class="link" data-testid="action-center-open-control-centre" onclick={() => onopencontrolcentre?.()}>Open Control Center</button>
    {#if onopeneventviewer}<button type="button" class="link" data-testid="action-center-open-event-viewer" onclick={() => onopeneventviewer?.()}>Open Event Viewer</button>{/if}
  </div>
</div>

<style>
  .look {
    margin: 0 0 4px;
    padding: 2px 6px;
    border: 1px solid var(--xp-balloon-border);
    background: var(--xp-balloon-tail);
    font-weight: 700;
  }
  .xp-action-center {
    box-sizing: border-box;
    width: 336px;
    border: 1px solid var(--xp-popup-border);
    background: #fff;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6) inset, var(--xp-shadow-popup), 0 6px 20px rgba(0, 0, 0, 0.4);
    font: var(--xp-font);
    color: #000;
  }
  .head {
    padding: 9px 12px;
    font-size: 14px;
    color: #1e395b;
    background: linear-gradient(#f7fafe, #dfe9f6);
    border-bottom: 1px solid #c7d4e6;
  }
  section {
    padding: 8px 12px 6px;
  }
  h4 {
    margin: 0 0 6px;
    font: inherit;
    color: #1e5aa8;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .what {
    flex: 1;
    min-width: 0;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .detail {
    color: #444;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0 0 8px;
    line-height: 1.35;
  }
  .message {
    margin: 0 0 8px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .message .body {
    flex: 1;
    min-width: 0;
  }
  .message p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .mtitle {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 1px;
  }
  .mtitle b {
    flex: 1;
    min-width: 0;
  }
  .swatch {
    flex: none;
    width: 10px;
    height: 10px;
    border: 1px solid #404040;
  }
  .time {
    color: var(--xp-text-muted);
  }
  section:last-of-type {
    max-height: 320px;
    overflow-y: auto;
  }
  .quiet {
    color: var(--xp-text-muted);
  }
  .foot {
    padding: 8px 12px 10px;
    border-top: 1px solid #e3e8ef;
    background: #f7f9fc;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--xp-link);
    cursor: default;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
