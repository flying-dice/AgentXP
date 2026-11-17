<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    /** The section can be folded with its chevron. Default true. */
    collapsible?: boolean
    collapsed?: boolean
    class?: string
    /** `data-testid` of the section; the fold button gets `<testid>-toggle`. */
    testid?: string
    children?: Snippet
  }

  let { title, collapsible = true, collapsed = $bindable(false), class: className = '', testid, children }: Props = $props()
  const uid = $props.id()
</script>

<section class="xp-tasksection {className}" data-testid={testid} data-collapsed={collapsed}>
  <h3>
    <span class="title">{title}</span>
    {#if collapsible}
      <button type="button" class="fold" aria-expanded={!collapsed} aria-controls="{uid}-body" aria-label="{collapsed ? 'Expand' : 'Collapse'} {title}" data-testid={testid ? `${testid}-toggle` : undefined} onclick={() => (collapsed = !collapsed)}>
        <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
          <circle cx="4.5" cy="4.5" r="4" fill="#fff" stroke="#9fb3e3" />
          <path d={collapsed ? 'M2.5 3l2 2 2-2' : 'M2.5 6l2-2 2 2'} fill="none" stroke="#215dc6" stroke-width="1.3" />
        </svg>
      </button>
    {/if}
  </h3>
  {#if !collapsed}
    <div class="body" id="{uid}-body">{@render children?.()}</div>
  {/if}
</section>

<style>
  .xp-tasksection {
    border-radius: 6px 6px 0 0;
    overflow: hidden;
    color: var(--xp-text);
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 3px 4px 3px 10px;
    font: inherit;
    font-weight: 700;
    color: var(--xp-taskpane-title);
    background: var(--xp-taskpane-head);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fold {
    flex: none;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: default;
  }
  .fold:focus-visible {
    outline: 1px dotted #000;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    background: var(--xp-taskpane-body);
    border: 1px solid #fff;
    border-top: 0;
  }
</style>
