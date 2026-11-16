<script module lang="ts">
  export interface ActionCenterApproval {
    key: string
    title: string
    detail?: string
  }
  export interface ActionCenterMessage {
    id: number
    text: string
  }
</script>

<script lang="ts">
  import Button from '../atoms/Button.svelte'
  import { clickOutside } from '../actions/clickOutside'

  interface Props {
    approvals?: ActionCenterApproval[]
    messages?: ActionCenterMessage[]
    onreview?: (key: string) => void
    onopencontrolcentre?: () => void
    onclose?: () => void
    /** Tray button element: presses on it are not "outside". */
    ignore?: HTMLElement | null
  }

  let { approvals = [], messages = [], onreview, onopencontrolcentre, onclose, ignore = null }: Props = $props()
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="w7-action-center"
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
      <div class="row">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.5 17 4v5.5c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.600-7-9V4z" fill="#f2c230" stroke="#9a6e00" />
          <path d="M10 5.5v5M10 12.5v1.6" stroke="#5a3d00" stroke-width="1.8" />
        </svg>
        <div class="what">
          <div class="title">{a.title}</div>
          {#if a.detail}<div class="detail">{a.detail}</div>{/if}
        </div>
        <Button onclick={() => onreview?.(a.key)}>Review</Button>
      </div>
    {/each}
  </section>
  <section>
    <h4>Messages</h4>
    {#each messages as m (m.id)}
      <p>{m.text}</p>
    {:else}
      <p class="quiet">No new messages.</p>
    {/each}
  </section>
  <div class="foot"><button type="button" class="link" onclick={() => onopencontrolcentre?.()}>Open Control Centre</button></div>
</div>

<style>
  .w7-action-center {
    box-sizing: border-box;
    width: 336px;
    border: 1px solid var(--w7-popup-border);
    background: #fff;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6) inset, var(--w7-shadow-popup), 0 6px 20px rgba(0, 0, 0, 0.4);
    font: var(--w7-font);
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
    font: var(--w7-font-mono);
    font-size: 11px;
    color: #444;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0 0 8px;
    line-height: 1.35;
  }
  .quiet {
    color: var(--w7-text-muted);
  }
  .foot {
    padding: 8px 12px 10px;
    border-top: 1px solid #e3e8ef;
    background: #f7f9fc;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--w7-link);
    cursor: default;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
