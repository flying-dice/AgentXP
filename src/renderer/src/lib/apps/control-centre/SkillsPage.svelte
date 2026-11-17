<script lang="ts">
  /** Control Center > Skills and MCP Servers: what agents can use. Plain chats get everything that is on; teams pick from it. */
  import { onMount } from 'svelte'
  import type { McpServerInput } from '@shared/teams'
  import Button from '../../kit/atoms/Button.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'
  import ReasonNote from '../../kit/atoms/ReasonNote.svelte'
  import { firstReason, reasonFor } from '../../kit/atoms/reason'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn } from '../../kit/organisms/ListView'
  import { showFolderBrowser } from '../../kit/organisms/folderBrowser'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { TeamsStore } from '../../stores/TeamsStore.svelte'
  import type { DesktopHost } from '../types'
  import McpServerDialog from './McpServerDialog.svelte'
  import McpToolsDialog from './McpToolsDialog.svelte'
  import { formFromServer } from './mcpForm'
  import { mcpRows, skillRows } from './skillRows'

  interface Props {
    host: DesktopHost
  }

  let { host }: Props = $props()

  // svelte-ignore state_referenced_locally
  const store = new TeamsStore(host.api)
  let selectedSkill = $state<string[]>([])
  let selectedServer = $state<string[]>([])
  let editing = $state<{ id: number | null } | null>(null)
  let toolsOf = $state<number | null>(null)
  let busy = $state('')

  const skillColumns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 150 },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'State', width: 56 }
  ]
  const mcpColumns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 110 },
    { key: 'type', header: 'Type', width: 86 },
    { key: 'target', header: 'Command or address' },
    { key: 'tools', header: 'Tools', width: 96 },
    { key: 'status', header: 'State', width: 56 }
  ]
  const skillList = $derived(skillRows(store.skills))
  const serverList = $derived(mcpRows(store.servers))
  const skill = $derived(store.skills.find((s) => String(s.id) === selectedSkill[0]) ?? null)
  const server = $derived(store.servers.find((s) => String(s.id) === selectedServer[0]) ?? null)
  const toolsServer = $derived(store.servers.find((s) => s.id === toolsOf) ?? null)

  async function guard(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Control Center', buttons: 'OK', icon: 'error' })
    }
  }

  onMount(() => {
    void guard(() => store.load())
    // An agent changed skills or servers (skill_*, mcp_*): show it.
    return host.api.on('config.changed', (e) => (e.area === 'skills' || e.area === 'mcp') && void guard(() => store.load()))
  })

  /** Install...: the Browse For Folder dialog, then the skill is copied into AgentXP. */
  async function install(): Promise<void> {
    const path = await showFolderBrowser({ purpose: 'skill', source: host.api.fs })
    if (!path) return
    await guard(async () => {
      const installed = await store.change(() => host.api.skills.install(path))
      selectedSkill = [String(installed.id)]
    })
  }

  async function removeSkill(): Promise<void> {
    const target = skill
    if (!target) return
    const answer = await showMessageBox({ text: `Remove the skill "${target.name}"? Profiles and teams that use it lose it.`, caption: 'Control Center', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await guard(() => store.change(() => host.api.skills.remove(target.id)))
  }

  async function submit(input: McpServerInput): Promise<void> {
    const target = editing?.id ?? null
    await guard(async () => {
      const saved = await store.change(() => (target === null ? host.api.mcp.add(input) : host.api.mcp.update(target, input)))
      selectedServer = [String(saved.id)]
    })
  }

  async function removeServer(): Promise<void> {
    const target = server
    if (!target) return
    const answer = await showMessageBox({ text: `Remove the MCP server "${target.name}"? Profiles that use it lose it.`, caption: 'Control Center', buttons: 'YesNo', icon: 'warning' })
    if (answer === 'yes') await guard(() => store.change(() => host.api.mcp.remove(target.id)))
  }

  async function testServer(): Promise<void> {
    const target = server
    if (!target) return
    busy = `Connecting to ${target.name}…`
    await guard(() => store.change(() => host.api.mcp.test(target.id)))
    busy = ''
  }

  const noSkill = $derived(skill ? null : 'Select a skill first')
  const noServer = $derived(server ? null : 'Select a server first')
  const toolsReason = $derived(firstReason([!server && 'Select a server first', server && server.tools.length === 0 && 'Test the connection first to find its tools']))
  const serverNote = $derived(busy || server?.lastTest?.message || '')
</script>

<p class="lead">Skills and MCP servers are what agents can use. A plain chat gets everything that is on. Teams give each profile its own.</p>
<div class="sections">
  <GroupBox text="Skills" class="section">
    <div class="block">
      <div class="list">
        <ListView columns={skillColumns} rows={skillList} bind:selected={selectedSkill} aria-label="Skills" testid="skills-list" rowTestid="skills-row" emptyText="No skills yet. Choose Install... and pick a folder that has a SKILL.md." />
      </div>
      <div class="side">
        <Button data-testid="skills-install" onclick={() => void install()}>Install...</Button>
        <Button data-testid="skills-remove" {...reasonFor(noSkill)} onclick={() => void removeSkill()}>Remove</Button>
        <Button data-testid="skills-toggle" {...reasonFor(noSkill)} onclick={() => skill && void guard(() => store.change(() => host.api.skills.setEnabled(skill.id, !skill.enabled)))}>{skill?.enabled === false ? 'Turn On' : 'Turn Off'}</Button>
      </div>
    </div>
  </GroupBox>
  <GroupBox text="MCP servers" class="section">
    <div class="block">
      <div class="list">
        <ListView columns={mcpColumns} rows={serverList} bind:selected={selectedServer} aria-label="MCP servers" testid="mcp-list" rowTestid="mcp-row" emptyText="No MCP servers yet. Choose Add... to register one." onactivate={() => server && (editing = { id: server.id })} />
      </div>
      <div class="side">
        <Button data-testid="mcp-add" onclick={() => (editing = { id: null })}>Add...</Button>
        <Button data-testid="mcp-edit" {...reasonFor(noServer)} onclick={() => server && (editing = { id: server.id })}>Edit...</Button>
        <Button data-testid="mcp-remove" {...reasonFor(noServer)} onclick={() => void removeServer()}>Remove</Button>
        <Button data-testid="mcp-toggle" {...reasonFor(noServer)} onclick={() => server && void guard(() => store.change(() => host.api.mcp.setEnabled(server.id, !server.enabled)))}>{server?.enabled === false ? 'Turn On' : 'Turn Off'}</Button>
        <Button data-testid="mcp-test" {...reasonFor(noServer)} onclick={() => void testServer()}>Test connection</Button>
        <Button data-testid="mcp-tools" {...reasonFor(toolsReason)} onclick={() => server && (toolsOf = server.id)}>Tools...</Button>
      </div>
    </div>
    <div class="note" role="status" data-testid="mcp-status">{serverNote}</div>
    <ReasonNote testid="mcp-reason" reason={noServer} />
  </GroupBox>
</div>

{#if editing}
  {@const target = store.servers.find((s) => s.id === editing?.id)}
  <McpServerDialog
    title={target ? 'Edit MCP Server' : 'Add MCP Server'}
    initial={target ? formFromServer(target) : undefined}
    contained
    onprobe={(input) => host.api.mcp.probe(input)}
    onsubmit={(input) => void submit(input)}
    onclose={() => (editing = null)}
  />
{/if}
{#if toolsServer}
  <McpToolsDialog server={toolsServer} contained ontoggle={(tool, on) => void guard(() => store.change(() => host.api.mcp.setToolEnabled(toolsServer.id, tool, on)))} onclose={() => (toolsOf = null)} />
{/if}

<style>
  .lead {
    margin: 0 0 10px;
  }
  .sections {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sections :global(.section) {
    display: flex;
    flex-direction: column;
  }
  .block {
    display: flex;
    gap: 8px;
  }
  .list {
    flex: 1;
    min-width: 0;
    height: 150px;
    display: flex;
    flex-direction: column;
  }
  .list :global(.xp-listview) {
    flex: 1;
    min-height: 0;
  }
  .side {
    flex: none;
    width: 130px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .note {
    min-height: 16px;
    margin-top: 6px;
  }
</style>
