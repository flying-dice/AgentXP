<script lang="ts">
  import { untrack } from 'svelte'
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import type { AppProps } from '../types'
  import { cwdLabel } from '../explorer/explorerModel'
  import { connectionLabel, contextPercent } from '../../app/sessionStatus'
  import SessionView from '../../app/session/SessionView.svelte'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import TasksPane from '../../app/shell/TasksPane.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { useSessionStores } from '../sessionStores.svelte'

  let { window: win, host }: AppProps<'chat'> = $props()

  const sessionId = $derived(win.view.sessionId)
  // The store is created (and connected) on first use and shared with the other apps of the desktop.
  // svelte-ignore state_referenced_locally
  const stores = useSessionStores(host)
  $effect(() => {
    if (sessionId > 0) untrack(() => stores.open(sessionId))
  })
  const store = $derived(sessionId > 0 ? (stores.peek(sessionId) ?? null) : null)

  let session = $state.raw<SessionDto | null>(null)
  /** The chat's working directory shown like the old folder (name and path). */
  const folder = $derived<FolderDto | null>(session ? { id: 0, name: cwdLabel(session.cwd, host.state.drives), path: session.cwd, lastOpenedAt: null } : null)
  let agent = $state.raw<AgentDto | null>(null)
  let panelOpen = $state(false)
  let panelTab = $state('changes')
  let selectedChangeId = $state<number | null>(null)

  // The row of the chat, its folder and agent; followed through `session.changed`.
  $effect(() => {
    const id = sessionId
    if (id <= 0) return
    let stale = false
    void (async () => {
      try {
        const [s, agents] = await Promise.all([host.api.sessions.get(id), host.api.agents.list()])
        if (stale) return
        session = s
        agent = agents.find((a) => a.id === s.agentId) ?? null
      } catch {
        if (!stale) session = null
      }
    })()
    const off = host.api.on('session.changed', (changed) => {
      if (changed.id === id) session = changed
    })
    return () => {
      stale = true
      off()
    }
  })

  const info = $derived(store?.state.session)
  const title = $derived(info?.title || session?.title || win.view.title)
  const changes = $derived(store?.state.changes ?? [])
  const tasks = $derived(store?.state.tasks ?? [])
  const models = $derived((info?.models.length ? info.models : session?.models) ?? [])
  const modelId = $derived(info?.currentModelId ?? session?.currentModelId ?? '')
  const status = $derived(info?.status && info.status !== 'closed' ? info.status : (session?.status ?? null))
  const percent = $derived(contextPercent(info?.contextUsed ?? session?.contextUsed ?? 0, info?.contextSize ?? session?.contextSize ?? 0))
  const codeWindow = $derived(host.state.windows.find((w) => w.view.app === 'code'))
  const openFilePath = $derived(codeWindow?.view.app === 'code' ? codeWindow.view.activePath : null)
  const tabs = $derived<TabDef[]>([
    { id: 'changes', title: changes.length > 0 ? `Changes (${changes.length})` : 'Changes', testid: 'chat-tab-changes' },
    { id: 'tasks', title: 'Tasks', testid: 'chat-tab-tasks' }
  ])

  // The window title follows the chat title.
  $effect(() => {
    if (title && title !== win.view.title) host.updateView(win.id, { app: 'chat', sessionId, title })
  })

  async function revert(change: (typeof changes)[number]): Promise<void> {
    const answer = await showMessageBox({
      text: `Revert the changes to ${change.path}?\n\nThe file goes back to how it was before the agent edited it.`,
      caption: 'Agent7',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.sessions.revertChange(change.id)
      await store?.connect()
      selectedChangeId = null
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Agent7', buttons: 'OK', icon: 'error' })
    }
  }

  const setModel = (id: string): void => void host.api.sessions.setModel(sessionId, id)
  const setMode = (id: number, modeId: string): Promise<void> => host.api.sessions.setMode(id, modeId)
  const pickFiles = (): Promise<string[]> => host.api.dialogs.pickFiles()
</script>

<div class="chat" data-testid="chat-app" data-session-id={sessionId}>
  <div class="bar">
    <span>Model:</span>
    <ComboBox
      aria-label="Model"
      testid="chat-model"
      items={models.map((m) => ({ value: m.id, label: m.name }))}
      value={modelId}
      disabled={models.length === 0}
      onchange={setModel}
      style="width:170px"
    />
    <span class="spring"></span>
    <ToolStripButton icon="changes" text={changes.length > 0 ? `Tasks and changes (${changes.length})` : 'Tasks and changes'} bind:checked={panelOpen} checkOnClick data-testid="chat-panel-toggle" />
  </div>
  <div class="row">
    <div class="main">
      {#if store && session}
        {#key sessionId}
          <SessionView {store} {session} {folder} {agent} {openFilePath} {setMode} {pickFiles} contained />
        {/key}
      {:else}
        <div class="blank">{sessionId > 0 ? 'Opening the chat...' : 'This chat has no session yet.'}</div>
      {/if}
    </div>
    {#if panelOpen}
      <aside class="side" data-testid="chat-side-panel" aria-label="Tasks and changes">
        <TabControl {tabs} bind:selected={panelTab} aria-label="Inspector">
          {#snippet panel(tab)}
            {#if tab.id === 'changes'}
              <ChangesPane
                {changes}
                bind:selectedId={selectedChangeId}
                onrevert={(c) => void revert(c)}
                onopeneditor={(c) => folder && void host.openApp({ app: 'code', path: c.path })}
              />
            {:else}
              <TasksPane {tasks} />
            {/if}
          {/snippet}
        </TabControl>
      </aside>
    {/if}
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={store?.error ?? folder?.path ?? ''} spring />
    {#if session}
      <StatusStripLabel borders={['left']}>
        <span>Context</span>
        <ProgressBar width={80} value={percent} label="Context used" />
        <span class="pct">{percent}%</span>
      </StatusStripLabel>
    {/if}
    <StatusStripLabel testid="chat-status" text={connectionLabel(status)} borders={['left']} />
  </StatusStrip>
</div>

<style>
  .chat {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .spring {
    flex: 1;
  }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .main {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .side {
    flex: none;
    width: 270px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 4px 4px 0;
  }
  .blank {
    flex: 1;
    padding: 8px;
    color: var(--w7-text-muted);
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
  .pct {
    min-width: 30px;
    text-align: right;
  }
</style>
