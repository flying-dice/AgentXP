<script lang="ts">
  /** Control Center > Agents: the agents tab of the old Options dialog as a page. */
  import { onMount } from 'svelte'
  import type { AgentInput } from '@shared/ipc'
  import type { AgentDto } from '@shared/models'
  import AgentEditDialog from '../../app/options/AgentEditDialog.svelte'
  import { formFromAgent } from '../../app/options/agentForm'
  import Button from '../../kit/atoms/Button.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { AgentsStore } from '../../stores/AgentsStore.svelte'
  import type { DesktopHost } from '../types'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

  // svelte-ignore state_referenced_locally
  const agents = new AgentsStore(host.api.agents)
  let selected = $state<string[]>([])
  let editing = $state<{ agent: AgentDto | null } | null>(null)

  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 120 },
    { key: 'command', header: 'Command' },
    { key: 'isDefault', header: 'Default', width: 56 }
  ]
  const rows = $derived<ListRow[]>(
    agents.items.map((a) => ({ id: String(a.id), icon: 'agent', name: a.name, command: [a.command, ...a.args].join(' '), isDefault: a.isDefault ? 'Yes' : '' }))
  )
  const selectedAgent = $derived(agents.items.find((a) => String(a.id) === selected[0]) ?? null)

  async function guard(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Control Center', buttons: 'OK', icon: 'error' })
    }
  }

  onMount(() => void guard(() => agents.load()))

  async function submit(input: AgentInput, makeDefault: boolean): Promise<void> {
    const target = editing?.agent
    await guard(async () => {
      const id = target ? target.id : (await agents.create(input)).id
      if (target) await agents.update(id, input)
      else selected = [String(id)]
      if (makeDefault && !target?.isDefault) await agents.setDefault(id)
    })
  }

  async function remove(): Promise<void> {
    const agent = selectedAgent
    if (!agent) return
    const answer = await showMessageBox({ text: `Remove the agent "${agent.name}"?`, caption: 'Control Center', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await guard(() => agents.remove(agent.id))
  }
</script>

<p class="lead">Agents are the programs behind your chats. New desktops use the default agent. A chat uses the agent of the desktop it is on.</p>
<div class="agents">
  <div class="list">
    <ListView
      {columns}
      {rows}
      bind:selected
      aria-label="Agents"
      testid="agents-list"
      rowTestid="agents-row"
      emptyText="No agents yet. Choose Add... to register one."
      onactivate={() => selectedAgent && (editing = { agent: selectedAgent })}
    />
  </div>
  <div class="side">
    <Button data-testid="agents-add" onclick={() => (editing = { agent: null })}>Add...</Button>
    <Button data-testid="agents-edit" disabled={!selectedAgent} onclick={() => selectedAgent && (editing = { agent: selectedAgent })}>Edit...</Button>
    <Button data-testid="agents-remove" disabled={!selectedAgent} onclick={remove}>Remove</Button>
    <Button data-testid="agents-set-default" disabled={!selectedAgent || selectedAgent.isDefault} onclick={() => selectedAgent && guard(() => agents.setDefault(selectedAgent.id))}>Set as Default</Button>
  </div>
</div>

{#if editing}
  <AgentEditDialog
    title={editing.agent ? 'Edit Agent' : 'Add Agent'}
    initial={editing.agent ? formFromAgent(editing.agent) : undefined}
    contained
    oncheck={(command) => host.api.agents.check(command)}
    onsubmit={submit}
    onclose={() => (editing = null)}
  />
{/if}

<style>
  .lead {
    margin: 0 0 10px;
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
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .side {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
