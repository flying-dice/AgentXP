<script lang="ts">
  /** Control Center > Permissions: Allow / Ask / Deny per thing the agent may do or use, in two blocks. */
  import { onDestroy, onMount } from 'svelte'
  import type { PolicyDecision, ToolPolicyDto } from '@shared/desktop'
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import type { DesktopHost } from '../types'
  import {
    DECISION_ITEMS,
    SAVED_MS,
    decisionNote,
    SAVED_TEXT,
    helpFor,
    isDecision,
    isNarrowPage,
    permissionGroups,
    policiesEqual,
    settingTestid,
    withAllDecisions,
    withDecision,
    type PolicyKey
  } from './permissionsTable'

  interface Props {
    host: DesktopHost
    /** The row a top bar chip asked for ("terminal"): highlighted and scrolled into view. */
    selectedRow?: string | null
  }

  let { host, selectedRow = null }: Props = $props()

  /** Scrolls the requested row into view once the rows exist. */
  function reveal(node: HTMLElement, selected: boolean): { update: (selected: boolean) => void } {
    const go = (on: boolean): void => {
      if (on) node.scrollIntoView?.({ block: 'nearest' })
    }
    go(selected)
    return { update: go }
  }

  /** The width of the page: in a narrow one (the chat pane is open) the help is short, with a "More" link (UX-198). */
  let pageWidth = $state(0)
  let helpOpen = $state(false)
  const help = $derived(helpFor(isNarrowPage(pageWidth), helpOpen))

  let saved = $state.raw<ToolPolicyDto | null>(null)
  let draft = $state.raw<ToolPolicyDto | null>(null)
  let busy = $state(false)
  let allValue = $state<PolicyDecision>('ask')
  let status = $state('')
  let statusTimer: ReturnType<typeof setTimeout> | null = null

  onMount(() => {
    void host.api.desktop.policy().then((p) => {
      saved = p
      draft = p
    })
  })
  onDestroy(() => {
    if (statusTimer) clearTimeout(statusTimer)
  })

  const groups = $derived(draft ? permissionGroups(draft) : [])
  const dirty = $derived(!!saved && !!draft && !policiesEqual(saved, draft))

  function set(key: PolicyKey, value: string): void {
    if (!draft || !isDecision(value)) return
    draft = withDecision(draft, key, value)
    status = ''
  }

  function setAll(): void {
    if (!draft) return
    draft = withAllDecisions(draft, allValue)
    status = ''
  }

  function showSaved(): void {
    status = SAVED_TEXT
    if (statusTimer) clearTimeout(statusTimer)
    statusTimer = setTimeout(() => (status = ''), SAVED_MS)
  }

  async function apply(): Promise<void> {
    if (!draft) return
    busy = true
    try {
      await host.api.desktop.setPolicy(draft)
      saved = draft
      showSaved()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Control Center', buttons: 'OK', icon: 'error' })
    } finally {
      busy = false
    }
  }
</script>

<div class="page-body" bind:clientWidth={pageWidth} data-testid="permissions-page" data-narrow={isNarrowPage(pageWidth)}>
<p class="callout" role="note" data-testid="permissions-callout">{help.text}
  {#if help.collapsed}<button type="button" class="more" data-testid="permissions-help-more" aria-expanded="false" onclick={() => (helpOpen = true)}>More</button>
  {:else if isNarrowPage(pageWidth)}<button type="button" class="more" data-testid="permissions-help-less" aria-expanded="true" onclick={() => (helpOpen = false)}>Less</button>{/if}
</p>
<div class="all" role="group" aria-label="Set all permissions">
  <span class="all-label">Set every permission to:</span>
  <ComboBox testid="permissions-set-all-value" aria-label="Set every permission to" items={DECISION_ITEMS} bind:value={allValue} style="width:80px" />
  <Button data-testid="permissions-set-all" disabled={!draft} onclick={setAll}>Set all</Button>
</div>
<div class="table" role="table" aria-label="Permissions" data-testid="permissions-table">
  <div class="head" role="row">
    <span role="columnheader">Permission and what it covers</span>
    <span role="columnheader">Setting</span>
  </div>
  <div class="rows">
  {#each groups as group (group.id)}
    <div class="group" role="row" data-testid="permissions-group" data-group={group.id}><span role="columnheader">{group.title}</span></div>
    {#each group.rows as row (row.key)}
      <div class="row" class:selected={row.key === selectedRow} use:reveal={row.key === selectedRow} role="row" data-testid="permissions-row" data-key={row.key} data-selected={row.key === selectedRow}>
        <span class="name" role="cell" title={row.tooltip}>{row.label}</span>
        <span class="setting" role="cell"><ComboBox testid={settingTestid(row.key)} aria-label={row.label} items={DECISION_ITEMS} value={row.decision} onchange={(v) => set(row.key, v)} style="width:96px" /></span>
        <span class="mode" role="cell" data-testid="permissions-mode">{decisionNote(row.decision)}.</span>
        <span class="what" role="cell" data-testid="permissions-covers">{row.description}</span>
      </div>
    {/each}
  {:else}
    <div class="row"><span class="what">Loading...</span></div>
  {/each}
  </div>
</div>
<div class="footer">
  <span class="note" role="status" data-testid="permissions-status" data-kind={dirty ? 'pending' : status ? 'saved' : 'none'}>{dirty ? 'Not applied yet' : status}</span>
  <Button data-testid="permissions-ok" isDefault disabled={!dirty || busy} onclick={apply}>OK</Button>
  <Button data-testid="permissions-cancel" disabled={!dirty} onclick={() => (draft = saved)}>Cancel</Button>
  <Button data-testid="permissions-apply" disabled={!dirty || busy} onclick={apply}>Apply</Button>
</div>
</div>

<style>
  /* The whole page in one column: the help, the "Set every permission" row and the table take the page width; the page scrolls when the window is short. */
  .page-body {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .more {
    padding: 0;
    border: 0;
    background: none;
    color: var(--w7-link);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .more:focus-visible {
    outline: var(--w7-focus-outline);
  }
  .all {
    flex-wrap: wrap;
  }
  /* The sentence about Code and Notepad sits above the list in a callout, so it is read before the first row. */
  .callout {
    flex: none;
    margin: 0 0 8px;
    padding: 6px 8px;
    border: 1px solid #b5c4dc;
    border-left: 3px solid #1e3287;
    background: #f1f6fd;
  }
  .all {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  /* The header is a fixed row with its own height; only the rows below it scroll. */
  .table {
    flex: 1;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .rows {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  /* Two lines per row: the name and its setting on the first, what it covers (wrapped) on the second. No sideways scroll. */
  .head,
  .row {
    display: grid;
    /* The name column never gets narrower than the longest name, so "Run commands" stays on one line. */
    grid-template-columns: minmax(176px, 1fr) 96px;
    align-items: center;
    column-gap: 8px;
    padding: 0 8px;
  }
  .head {
    flex: none;
    height: 24px;
    box-sizing: border-box;
    background: linear-gradient(#fff, #f1f4f9 50%, #e5eaf2 51%, #eef2f8);
    border-bottom: 1px solid #d5dfe5;
    color: #4c607a;
  }
  .group {
    padding: 4px 8px 2px;
    color: #1e3287;
    border-bottom: 1px solid #d5dfe5;
    background: #f6f9fd;
  }
  .row {
    grid-template-areas: 'name setting' 'what what' 'mode mode';
    row-gap: 1px;
    padding-top: 3px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f0f0f0;
  }
  .row.selected {
    background: var(--w7-select-face, #c4e5f6);
    outline: 1px solid var(--w7-hot-border, #3399ff);
    outline-offset: -1px;
  }
  .name {
    grid-area: name;
    font-weight: 600;
    white-space: nowrap;
  }
  .setting {
    grid-area: setting;
  }
  .what {
    grid-area: what;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--w7-text-muted);
  }
  .mode {
    grid-area: mode;
    min-width: 0;
    color: #1e3287;
  }
  /* A footer of one fixed height: the note has its own reserved line to the left (two lines at most), so the buttons never move. */
  .footer {
    flex: none;
    height: 36px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }
  .footer :global(button) {
    flex: none;
  }
  .note {
    flex: 1;
    min-width: 0;
    max-height: 32px;
    overflow: hidden;
    line-height: 16px;
    color: var(--w7-text-muted);
  }
  .note[data-kind='pending'] {
    color: #8a5a00;
  }
</style>
