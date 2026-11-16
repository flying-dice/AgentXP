<script lang="ts">
  import ReasonNote from '../../kit/atoms/ReasonNote.svelte'
  import { firstReason, reasonFor } from '../../kit/atoms/reason'
  /** Control Center > Agents: the agents tab of the old Options dialog as a page. */
  import { onMount, tick } from 'svelte'
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
  import { aboutOf, agentToSelect, commandOf } from './agentRows'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

  // svelte-ignore state_referenced_locally
  const agents = new AgentsStore(host.api.agents)
  let selected = $state<string[]>([])
  let editing = $state<{ agent: AgentDto | null } | null>(null)

  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 170 },
    { key: 'about', header: 'About', width: 200 },
    { key: 'command', header: 'Command' },
    { key: 'mode', header: 'Start mode', width: 120 },
    { key: 'isDefault', header: 'Default', width: 56 }
  ]
  const rows = $derived<ListRow[]>(
    agents.items.map((a) => ({ id: String(a.id), icon: 'agent', name: a.name, about: aboutOf(a), command: commandOf(a), mode: a.defaultModeId ?? '', isDefault: a.isDefault ? 'Yes' : '' }))
  )
  const selectedAgent = $derived(agents.items.find((a) => String(a.id) === selected[0]) ?? null)

  async function guard(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Control Center', buttons: 'OK', icon: 'error' })
    }
  }

  /** Opened from a chat whose agent failed ("Open Agents"): that agent is selected and scrolled into view (UX-149). */
  async function selectBroken(): Promise<void> {
    if (selected.length > 0) return
    const sessions = await host.api.sessions.list(host.state.desktopId).catch(() => [])
    const id = agentToSelect(sessions, agents.items)
    if (id === null || selected.length > 0) return
    selected = [String(id)]
    await tick()
    document.querySelector('[data-testid="agents-row"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }

  onMount(() => void guard(() => agents.load()).then(selectBroken))

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

  /** Why Edit and Remove are off, and why Set as Default is (one note under the buttons). */
  const noAgent = $derived(selectedAgent ? null : 'Select an agent first')
  const defaultReason = $derived(firstReason([!selectedAgent && 'Select an agent first', selectedAgent?.isDefault && 'This is already the default']))
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
    <Button data-testid="agents-edit" {...reasonFor(noAgent)} onclick={() => selectedAgent && (editing = { agent: selectedAgent })}>Edit...</Button>
    <Button data-testid="agents-remove" {...reasonFor(noAgent)} onclick={remove}>Remove</Button>
    <Button data-testid="agents-set-default" {...reasonFor(defaultReason)} onclick={() => selectedAgent && guard(() => agents.setDefault(selectedAgent.id))}>Set as Default</Button>
    <ReasonNote testid="agents-reason" reason={defaultReason} />
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
    width: 160px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .side :global(.w7-reason) {
    white-space: normal;
    min-height: 2.6em;
  }
</style>
