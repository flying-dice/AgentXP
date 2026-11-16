<script lang="ts">
  import { onMount } from 'svelte'
  import type { AgentProcessDto } from '@shared/desktop'
  import type { AgentDto, SessionDto, TerminalDto } from '@shared/models'
  import type { AppProps } from '../types'
  import Button from '../../kit/atoms/Button.svelte'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import DataGridView from '../../kit/organisms/DataGridView.svelte'
  import type { CellRef, GridColumn } from '../../kit/organisms/DataGridView'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { chatRows, contextState, formatTokens, processRows, terminalRows } from './processRows'

  let { host }: AppProps<'agent-manager'> = $props()

  /** How often the lists refresh while the window is open. */
  const REFRESH_MS = 2000

  let processes = $state.raw<AgentProcessDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  let agents = $state.raw<AgentDto[]>([])
  let terminals = $state.raw<TerminalDto[]>([])
  let tab = $state('chats')
  let current = $state<CellRef>({ row: 0, col: 0 })
  let selectedChat = $state<string[]>([])
  let error = $state<string | null>(null)

  const tabs: TabDef[] = [
    { id: 'chats', title: 'Chats' },
    { id: 'processes', title: 'Processes' },
    { id: 'terminals', title: 'Terminals' },
    { id: 'performance', title: 'Performance' }
  ]

  async function refresh(): Promise<void> {
    try {
      const [p, s, a] = await Promise.all([host.api.processes.list(), host.api.sessions.list(host.state.folder.id), host.api.agents.list()])
      processes = p
      sessions = s
      agents = a
      terminals = (await Promise.all(s.map((x) => host.api.sessions.terminals(x.id).catch(() => [] as TerminalDto[])))).flat()
      error = null
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  onMount(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  })

  const procColumns: GridColumn[] = [
    { key: 'agent', header: 'Agent', width: 200, readOnly: true },
    { key: 'pid', header: 'PID', width: 90, readOnly: true },
    { key: 'desktop', header: 'Desktop', width: 150, readOnly: true },
    { key: 'chats', header: 'Chats', width: 100, readOnly: true }
  ]
  const procRows = $derived(processRows(processes, host.state.desktopId))
  const selectedProcess = $derived(procRows[current.row] ?? null)

  const chatColumns: ListColumn[] = [
    { key: 'title', header: 'Chat', width: 210 },
    { key: 'agent', header: 'Agent', width: 110 },
    { key: 'status', header: 'Status', width: 110 },
    { key: 'tokens', header: 'Tokens', width: 110, align: 'right' },
    { key: 'context', header: 'Context', align: 'right' }
  ]
  const terminalColumns: ListColumn[] = [
    { key: 'chat', header: 'Chat', width: 150 },
    { key: 'command', header: 'Command', width: 210 },
    { key: 'status', header: 'Status', width: 90 },
    { key: 'cwd', header: 'Working folder' }
  ]
  const termRows = $derived<ListRow[]>(terminalRows(terminals, sessions).map((t) => ({ ...t, icon: 'terminal' as const })))
  const chats = $derived(chatRows(sessions, agents))
  const chatListRows = $derived<ListRow[]>(chats.map((c) => ({ ...c, icon: 'session' as const })))

  const selectedChatRow = $derived(chats.find((c) => c.id === selectedChat[0]) ?? null)

  async function endTask(): Promise<void> {
    const chat = selectedChatRow
    if (!chat) return
    try {
      await host.api.sessions.cancel(Number(chat.id))
    } catch (e) {
      await showMessageBox({ text: e instanceof Error ? e.message : String(e), caption: 'Agent7 Task Manager', buttons: 'OK', icon: 'error' })
    }
    await refresh()
  }

  async function endProcess(): Promise<void> {
    const proc = selectedProcess
    if (!proc) return
    const answer = await showMessageBox({
      text: `Do you want to end ${proc.agent}?\n\nIts ${proc.chats} chat${proc.chats === 1 ? '' : 's'} will close and any work in progress is lost.`,
      caption: 'Agent7 Task Manager',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.processes.end(proc.agentId, proc.desktopId)
    } catch (e) {
      await showMessageBox({ text: e instanceof Error ? e.message : String(e), caption: 'Agent7 Task Manager', buttons: 'OK', icon: 'error' })
    }
    await refresh()
  }

  const totalContext = $derived(
    sessions.length === 0 ? 0 : Math.round(chats.reduce((sum, c) => sum + c.percent, 0) / sessions.length)
  )
</script>

<div class="am">
  <div class="tabs">
    <TabControl {tabs} bind:selected={tab} aria-label="Agent7 Task Manager">
      {#snippet panel(t)}
        <div class="page">
          {#if t.id === 'processes'}
            <div class="grid">
              <DataGridView columns={procColumns} rows={procRows} readOnly rowHeaders={false} aria-label="Agent processes" onselect={(cell) => (current = cell)} />
              {#if procRows.length === 0}<div class="empty">No agent is running. Start a chat to launch one.</div>{/if}
            </div>
            <div class="buttons">
              <Button disabled={!selectedProcess} onclick={endProcess}>End process</Button>
            </div>
          {:else if t.id === 'chats'}
            <div class="grid">
              <ListView columns={chatColumns} rows={chatListRows} bind:selected={selectedChat} aria-label="Chats" emptyText="There are no chats on this desktop yet." />
            </div>
            <div class="buttons">
              <Button disabled={!selectedChatRow || !selectedChatRow.busy} onclick={endTask}>End Task</Button>
            </div>
          {:else if t.id === 'terminals'}
            <div class="grid">
              <ListView columns={terminalColumns} rows={termRows} aria-label="Terminals" emptyText="No chat has opened a terminal yet." />
            </div>
          {:else}
            <div class="perf w7-scroll" aria-label="Context use per chat">
              <div class="caption">Context window use</div>
              {#each sessions as s (s.id)}
                {@const row = chats.find((c) => c.id === String(s.id))!}
                <div class="meter">
                  <span class="label" title={row.title}>{row.title}</span>
                  <ProgressBar width="100%" value={row.percent} state={contextState(row.percent)} label="Context used by {row.title}" class="bar" />
                  <span class="num">{row.percent}%</span>
                  <span class="tokens">{formatTokens(s.contextUsed)} / {formatTokens(s.contextSize)}</span>
                </div>
              {:else}
                <div class="empty static">There are no chats on this desktop yet.</div>
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}
    </TabControl>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={error ?? `Refreshes every ${REFRESH_MS / 1000} s`} spring />
    <StatusStripLabel text="Processes: {processes.length}" borders={['left']} width={100} />
    <StatusStripLabel text="Chats: {sessions.length}" borders={['left']} width={90} />
    <StatusStripLabel text="Terminals: {terminals.length}" borders={['left']} width={100} />
    <StatusStripLabel text="Context: {totalContext}%" borders={['left']} width={100} />
  </StatusStrip>
</div>

<style>
  .am {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 6px 6px 0;
  }
  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: linear-gradient(#fff, #f6f8fb);
  }
  .grid {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .grid :global(.w7-listview),
  .grid :global(.w7-grid) {
    flex: 1;
    min-height: 0;
  }
  .empty {
    position: absolute;
    left: 8px;
    right: 8px;
    top: 34px;
    color: var(--w7-text-muted);
  }
  .empty.static {
    position: static;
  }
  .buttons {
    flex: none;
    display: flex;
    justify-content: flex-end;
  }
  .perf {
    flex: 1;
    min-height: 0;
    padding: 6px;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .caption {
    margin-bottom: 8px;
    color: #1e3287;
  }
  .meter {
    display: grid;
    grid-template-columns: 190px 1fr 40px 90px;
    align-items: center;
    column-gap: 8px;
    min-height: 26px;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meter :global(.bar) {
    min-width: 0;
  }
  .num {
    text-align: right;
  }
  .tokens {
    color: var(--w7-text-muted);
    text-align: right;
  }
</style>
