<script lang="ts">
  import type { FolderDto, SessionDto } from '@shared/models'
  import type { AppProps } from '../types'
  import { cwdLabel } from '../explorer/explorerModel'
  import { connectionLabel, contextPercent } from '../../app/sessionStatus'
  import type { SessionAgentStore } from '../../agui/SessionAgentStore.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import TasksPane from '../../app/shell/TasksPane.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import type { SurfaceActivity } from '../../agui/activities'
  import type { SurfaceControls } from '../../app/session/surfaceRow'
  import SurfaceSidebar from './SurfaceSidebar.svelte'

  let { window: win, host }: AppProps<'chat'> = $props()

  const sessionId = $derived(win.view.sessionId)
  // The store (created and connected on first use, shared with the other apps of the desktop) and the session row
  // are loaded by the embedded chat panel and bound back here.
  let store = $state.raw<SessionAgentStore | null>(null)
  let session = $state.raw<SessionDto | null>(null)
  /** The chat's working directory shown like the old folder (name and path). */
  const folder = $derived<FolderDto | null>(session ? { id: 0, name: cwdLabel(session.cwd, host.state.drives), path: session.cwd, lastOpenedAt: null } : null)
  let panelOpen = $state(false)
  let panelTab = $state('changes')
  let selectedChangeId = $state<number | null>(null)

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
  // ---- A2UI surfaces of this chat: sidebar tabs, windows and the transcript rows ------------------------------
  const sidebarSurfaces = $derived([...(store?.activities.values() ?? [])].filter((s) => s.target === 'sidebar' && !s.hidden))
  let sidebarSelected = $state<string | null>(null)
  let sidebarWidth = $state(300)
  let knownSidebar = new Set<string>()
  // A sidebar surface that appears (or comes back) is brought to the front.
  $effect(() => {
    const ids = sidebarSurfaces.map((s) => s.surfaceId)
    const fresh = ids.find((id) => !knownSidebar.has(id))
    knownSidebar = new Set(ids)
    if (fresh) sidebarSelected = fresh
  })
  const surfaceWindow = (surfaceId: string) =>
    host.state.windows.find((w) => w.view.app === 'surface' && w.view.sessionId === sessionId && w.view.surfaceId === surfaceId)
  /** Changes made outside a turn (hide a tab, move, delete) are not streamed: load the persisted surfaces again. */
  const resync = async (change: Promise<void>): Promise<void> => {
    await change
    await store?.connect()
  }
  const surfaceControls: SurfaceControls = {
    windowOpen: (s) => surfaceWindow(s.surfaceId) !== undefined,
    open: (s) => {
      if (s.target === 'window') void host.openApp({ app: 'surface', sessionId, surfaceId: s.surfaceId })
      else if (s.target === 'sidebar') {
        sidebarSelected = s.surfaceId
        void resync(host.api.a2ui.setSidebarHidden(sessionId, s.surfaceId, false))
      }
    },
    close: (s) => {
      const w = surfaceWindow(s.surfaceId)
      if (s.target === 'window' && w) void host.closeWindow(w.id)
      else if (s.target === 'sidebar') void resync(host.api.a2ui.setSidebarHidden(sessionId, s.surfaceId, true))
    },
    remove: (s) => void deleteSurface(s),
    move: (s, target) => void resync(host.api.a2ui.moveSurface(sessionId, s.surfaceId, target))
  }

  async function deleteSurface(s: SurfaceActivity): Promise<void> {
    const answer = await showMessageBox({
      text: 'Delete this surface?\n\nIt is removed from the chat and its window closes. The agent can draw it again.',
      caption: 'Agent7',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await resync(host.api.a2ui.deleteSurface(sessionId, s.surfaceId))
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Agent7', buttons: 'OK', icon: 'error' })
    }
  }

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

  async function clearTranscript(): Promise<void> {
    const answer = await showMessageBox({
      text: 'Clear the transcript of this chat?\n\nThe messages and tool cards are removed from the window. The agent keeps its own memory of the conversation.',
      caption: 'Agent7',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.sessions.clearTranscript(sessionId)
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Agent7', buttons: 'OK', icon: 'error' })
    }
  }

  const menus = $derived<MenuDef[]>([
    {
      label: '&Chat',
      items: [
        { id: 'chat-clear', testid: 'chat-menu-clear', label: 'Clear &transcript...', disabled: sessionId <= 0, action: () => void clearTranscript() },
        { id: 'chat-panel', testid: 'chat-menu-panel', label: 'Tasks and &changes', checked: panelOpen, action: () => (panelOpen = !panelOpen) },
        { separator: true },
        { id: 'chat-close', testid: 'chat-menu-close', label: '&Close', action: () => void host.closeWindow(win.id) }
      ]
    },
    { label: '&Help', items: [{ id: 'chat-help', testid: 'chat-menu-help', label: '&Help on Chat', shortcut: 'F1', action: () => void host.openApp({ app: 'help', topic: 'chat' }) }] }
  ])

  const setModel = (id: string): void => void host.api.sessions.setModel(sessionId, id)
  const setMode = (id: number, modeId: string): Promise<void> => host.api.sessions.setMode(id, modeId)
  const pickFiles = (): Promise<string[]> => host.api.dialogs.pickFiles()
</script>

<div class="chat" data-testid="chat-app" data-session-id={sessionId}>
  <MenuStrip {menus} aria-label="Chat menu" />
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
      <EmbeddedChat {host} {sessionId} role="chat" {openFilePath} {setMode} {pickFiles} {surfaceControls} contained bind:store bind:session />
    </div>
    <SurfaceSidebar
      surfaces={sidebarSurfaces}
      {sessionId}
      selected={sidebarSelected}
      bind:width={sidebarWidth}
      onselect={(id) => (sidebarSelected = id)}
      onclose={(s) => surfaceControls.close(s)}
      onaction={(event) => void store?.sendA2uiAction(event)}
    />
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
    <StatusStripLabel testid="chat-cwd" text={store?.error ?? folder?.path ?? ''} spring />
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
  .pct {
    min-width: 30px;
    text-align: right;
  }
</style>
