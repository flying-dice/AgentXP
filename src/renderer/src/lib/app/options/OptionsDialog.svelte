<script lang="ts">
  import type { AgentInput } from '@shared/ipc'
  import type { AgentDto } from '@shared/models'
  import type { AgentsStore } from '../../stores/AgentsStore.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import AgentEditDialog from './AgentEditDialog.svelte'
  import { formFromAgent } from './agentForm'

  interface Props {
    agents: AgentsStore
    /** Tab to show first. */
    initialTab?: 'general' | 'agents'
    /** Start with the Add Agent form open. */
    addAgent?: boolean
    onerror?: (error: unknown) => void
    onclose?: () => void
  }

  let { agents, initialTab = 'general', addAgent = false, onerror, onclose }: Props = $props()

  const tabs: TabDef[] = [
    { id: 'general', title: 'General' },
    { id: 'agents', title: 'Agents' }
  ]
  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 130 },
    { key: 'command', header: 'Command' },
    { key: 'isDefault', header: 'Default', width: 60 }
  ]

  // svelte-ignore state_referenced_locally
  let tab = $state<string>(initialTab)
  // svelte-ignore state_referenced_locally
  let defaultId = $state<string>(String(agents.defaultAgent?.id ?? ''))
  let selected = $state<string[]>([])
  // svelte-ignore state_referenced_locally
  let editing = $state<{ agent: AgentDto | null } | null>(addAgent ? { agent: null } : null)

  const rows = $derived<ListRow[]>(
    agents.items.map((a) => ({ id: String(a.id), icon: 'agent', name: a.name, command: [a.command, ...a.args].join(' '), isDefault: a.isDefault ? 'Yes' : '' }))
  )
  const selectedAgent = $derived(agents.items.find((a) => String(a.id) === selected[0]) ?? null)
  const agentItems = $derived(agents.items.map((a) => ({ value: String(a.id), label: a.name })))

  async function guard(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      onerror?.(error)
    }
  }

  async function submit(input: AgentInput): Promise<void> {
    const target = editing?.agent
    await guard(async () => {
      if (target) await agents.update(target.id, input)
      else {
        const created = await agents.create(input)
        selected = [String(created.id)]
      }
    })
  }

  async function remove(): Promise<void> {
    const agent = selectedAgent
    if (!agent) return
    const answer = await showMessageBox({ text: `Remove the agent "${agent.name}"?`, caption: 'Agent7', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await guard(() => agents.remove(agent.id))
  }

  async function apply(): Promise<void> {
    const id = Number(defaultId)
    if (id && agents.defaultAgent?.id !== id) await guard(() => agents.setDefault(id))
  }

  async function result(r: DialogResult): Promise<void> {
    if (r === 'cancel') return onclose?.()
    await apply()
    if (r === 'ok') onclose?.()
  }
</script>

<Dialog title="Options" iconName="options" width="520px" onclose={() => onclose?.()}>
  <div class="tabs">
    <TabControl {tabs} bind:selected={tab} aria-label="Options">
      {#snippet panel(current)}
        <div class="page">
          {#if current.id === 'general'}
            <GroupBox text="New sessions">
              <div class="row">
                <span class="lbl">Default agent:</span>
                <ComboBox aria-label="Default agent" items={agentItems} bind:value={defaultId} style="width:220px" />
              </div>
              <p class="hint">New sessions start this agent unless you pick another one.</p>
            </GroupBox>
          {:else}
            <div class="agents">
              <div class="list">
                <ListView {columns} {rows} bind:selected aria-label="Agents" emptyText="No agents yet. Choose Add… to register one." onactivate={() => selectedAgent && (editing = { agent: selectedAgent })} />
              </div>
              <div class="side">
                <Button onclick={() => (editing = { agent: null })}>Add…</Button>
                <Button disabled={!selectedAgent} onclick={() => selectedAgent && (editing = { agent: selectedAgent })}>Edit…</Button>
                <Button disabled={!selectedAgent} onclick={remove}>Remove</Button>
                <Button disabled={!selectedAgent || selectedAgent.isDefault} onclick={() => selectedAgent && guard(() => agents.setDefault(selectedAgent.id).then(() => void (defaultId = String(selectedAgent.id))))}>Set as Default</Button>
              </div>
            </div>
          {/if}
        </div>
      {/snippet}
    </TabControl>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel', { result: 'none', label: 'Apply' }]} acceptButton="ok" onresult={result} />
  {/snippet}
</Dialog>

{#if editing}
  <AgentEditDialog
    title={editing.agent ? 'Edit Agent' : 'Add Agent'}
    initial={editing.agent ? formFromAgent(editing.agent) : undefined}
    onsubmit={submit}
    onclose={() => (editing = null)}
  />
{/if}

<style>
  .tabs {
    height: 280px;
  }
  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 10px;
    background: linear-gradient(#fff, #f6f8fb);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lbl {
    width: 92px;
  }
  .hint {
    margin: 8px 0 0;
    color: var(--w7-text-muted);
  }
  .agents {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 8px;
  }
  .list {
    flex: 1;
    min-width: 0;
  }
  .side {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
