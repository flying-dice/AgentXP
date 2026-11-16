<script lang="ts">
  /** Control Centre > Permissions: Allow / Ask / Deny per tool group, plus whether the agent may open apps. */
  import { onMount } from 'svelte'
  import type { ToolPolicyDto } from '@shared/desktop'
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import type { DesktopHost } from '../types'
  import { DECISION_ITEMS, isDecision, permissionRows, policiesEqual, withDecision, type PolicyKey } from './permissionsTable'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

  let saved = $state.raw<ToolPolicyDto | null>(null)
  let draft = $state.raw<ToolPolicyDto | null>(null)
  let busy = $state(false)

  onMount(() => {
    void host.api.desktop.policy().then((p) => {
      saved = p
      draft = p
    })
  })

  const rows = $derived(draft ? permissionRows(draft) : [])
  const dirty = $derived(!!saved && !!draft && !policiesEqual(saved, draft))

  function set(key: PolicyKey, value: string): void {
    if (draft && isDecision(value)) draft = withDecision(draft, key, value)
  }

  async function apply(): Promise<void> {
    if (!draft) return
    busy = true
    try {
      await host.api.desktop.setPolicy(draft)
      saved = draft
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Control Centre', buttons: 'OK', icon: 'error' })
    } finally {
      busy = false
    }
  }
</script>

<p class="lead">Choose what the agent may do on this computer. <b>Ask</b> shows a permission request in Action Center each time.</p>
<div class="table" role="table" aria-label="Permissions">
  <div class="head" role="row">
    <span role="columnheader">Permission</span>
    <span role="columnheader">Setting</span>
    <span role="columnheader">What it covers</span>
  </div>
  {#each rows as row (row.key)}
    <div class="row" class:apps={row.key === 'openApps'} role="row">
      <span class="name" role="cell">{row.label}</span>
      <span role="cell"><ComboBox aria-label={row.label} items={DECISION_ITEMS} value={row.decision} onchange={(v) => set(row.key, v)} style="width:96px" /></span>
      <span class="what" role="cell">{row.description}</span>
    </div>
  {:else}
    <div class="row"><span class="what">Loading...</span></div>
  {/each}
</div>
<div class="buttons">
  <Button disabled={!dirty} onclick={() => (draft = saved)}>Cancel</Button>
  <Button isDefault disabled={!dirty || busy} onclick={apply}>Apply</Button>
</div>

<style>
  .lead {
    margin: 0 0 10px;
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
    grid-template-columns: 150px 112px 1fr;
    align-items: center;
    column-gap: 8px;
    padding: 0 8px;
  }
  .head {
    height: 22px;
    background: linear-gradient(#fff, #f1f4f9 50%, #e5eaf2 51%, #eef2f8);
    border-bottom: 1px solid #d5dfe5;
    color: #4c607a;
  }
  .row {
    min-height: 30px;
    border-bottom: 1px solid #f0f0f0;
  }
  .row.apps {
    margin-top: 6px;
    border-top: 1px solid #d5dfe5;
  }
  .name {
    font-weight: 600;
  }
  .what {
    color: var(--w7-text-muted);
  }
  .buttons {
    flex: none;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }
</style>
