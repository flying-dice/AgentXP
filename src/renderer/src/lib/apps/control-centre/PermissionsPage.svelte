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
    SAVED_TEXT,
    isDecision,
    permissionGroups,
    policiesEqual,
    settingTestid,
    withAllDecisions,
    withDecision,
    type PolicyKey
  } from './permissionsTable'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

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

<p class="lead">Each row is separate. 'Write files' covers changing files in any app. 'Code' and 'Notepad' cover only what their rows list. <b>Ask</b> shows a permission request in the Action Center each time.</p>
<div class="all" role="group" aria-label="Set all permissions">
  <span class="all-label">Set every permission to:</span>
  <ComboBox testid="permissions-set-all-value" aria-label="Set every permission to" items={DECISION_ITEMS} bind:value={allValue} style="width:80px" />
  <Button data-testid="permissions-set-all" disabled={!draft} onclick={setAll}>Set all</Button>
</div>
<div class="table" role="table" aria-label="Permissions" data-testid="permissions-table">
  <div class="head" role="row">
    <span role="columnheader">Permission</span>
    <span role="columnheader">Setting</span>
    <span role="columnheader">What it covers</span>
  </div>
  {#each groups as group (group.id)}
    <div class="group" role="row" data-testid="permissions-group" data-group={group.id}><span role="columnheader">{group.title}</span></div>
    {#each group.rows as row (row.key)}
      <div class="row" role="row" data-testid="permissions-row" data-key={row.key}>
        <span class="name" role="cell">{row.label}</span>
        <span role="cell"><ComboBox testid={settingTestid(row.key)} aria-label={row.label} items={DECISION_ITEMS} value={row.decision} onchange={(v) => set(row.key, v)} style="width:96px" /></span>
        <span class="what" role="cell" title={row.description}>{row.description}</span>
      </div>
    {/each}
  {:else}
    <div class="row"><span class="what">Loading...</span></div>
  {/each}
</div>
<div class="footer">
  <span class="note" role="status" data-testid="permissions-status" data-kind={dirty ? 'pending' : status ? 'saved' : 'none'}>{dirty ? 'Not applied yet' : status}</span>
  <Button data-testid="permissions-ok" isDefault disabled={!dirty || busy} onclick={apply}>OK</Button>
  <Button data-testid="permissions-cancel" disabled={!dirty} onclick={() => (draft = saved)}>Cancel</Button>
  <Button data-testid="permissions-apply" disabled={!dirty || busy} onclick={apply}>Apply</Button>
</div>

<style>
  .lead {
    margin: 0 0 8px;
  }
  .all {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .table {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .head,
  .row {
    display: grid;
    grid-template-columns: 150px 96px minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    padding: 0 8px;
  }
  .head {
    position: sticky;
    top: 0;
    z-index: 1;
    height: 22px;
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
    height: 28px;
    border-bottom: 1px solid #f0f0f0;
  }
  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .what {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--w7-text-muted);
  }
  .footer {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }
  .note {
    flex: 1;
    min-width: 0;
    color: var(--w7-text-muted);
  }
  .note[data-kind='pending'] {
    color: #8a5a00;
  }
</style>
