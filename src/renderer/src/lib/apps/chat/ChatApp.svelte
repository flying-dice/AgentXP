<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import type { AppProps } from '../types'
  import { cwdLabel } from '../explorer/explorerModel'
  import { chatTitleLabels } from '../../app/chatTitles'
  import { describeProblem } from '../../app/session/chatProblem'
  import { folderLabel } from '../../app/session/folderLabel'
  import { NOT_RESPONDING_LINK, NOT_RESPONDING_MS, NOT_RESPONDING_TIP, showNotResponding } from '../../app/session/notResponding'
  import { connectionLabel, contextPercent, effectiveStatus, isDisconnected } from '../../app/sessionStatus'
  import { getDesktopContext } from '../../desktop/context'
  import type { SessionAgentStore } from '../../agui/SessionAgentStore.svelte'
  import EmbeddedChat from '../shared/EmbeddedChat.svelte'
  import { transcriptDetail } from '../../app/session/transcriptDetail.svelte'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import { openRecycleBin } from '../../app/changes/openRecycleBin'
  import { revertConfirmText } from '../../app/changes/changeFormat'
  import { undoRevertItem } from '../../app/changes/changeMenu'
  import TasksPane from '../../app/shell/TasksPane.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { copyText, quoteText, transcriptItems } from '../shared/contextItems'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import type { TabDef } from '../../kit/organisms/TabControl'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import type { SurfaceActivity } from '../../agui/activities'
  import type { SurfaceControls } from '../../app/session/surfaceRow'
  import SurfaceSidebar from './SurfaceSidebar.svelte'
  import { lastReply } from '../surface/lastReply'
  import { refreshOnRevert } from '../../app/changes/refreshOnRevert'
  import { useRevertedChanges } from '../../app/changes/revertedChanges.svelte'
  import { useUncommittedChanges } from '../../app/changes/uncommitted.svelte'

  let { window: win, host, focused }: AppProps<'chat'> = $props()

  const sessionId = $derived(win.view.sessionId)
  // The store (created and connected on first use, shared with the other apps of the desktop) and the session row
  // are loaded by the embedded chat panel and bound back here.
  let store = $state.raw<SessionAgentStore | null>(null)
  let session = $state.raw<SessionDto | null>(null)
  /** The chat's agent, bound back from the embedded chat (its name starts the failure line: "My assistant could not start: ..."). */
  let agent = $state.raw<AgentDto | null>(null)
  /** The chat's working directory shown like the old folder (name and path). */
  const folder = $derived<FolderDto | null>(session ? { id: 0, name: cwdLabel(session.cwd, host.state.drives), path: session.cwd, lastOpenedAt: null } : null)
  /** Where the chat works, as a person says it ("login-app (E:)"); the full path is the tooltip. */
  const where = $derived(session ? folderLabel(session.cwd, host.state.drives) : '')
  /** What went wrong, in plain words with the next step; the status bar shows this and never the raw error. */
  const problemLine = $derived(describeProblem({ error: store?.error ?? null, problem: session?.problem, failed: store?.failedSend ?? null, agentName: agent?.name })?.status ?? null)
  let panelOpen = $state(false)
  let panelTab = $state('changes')
  let selectedChangeId = $state<number | null>(null)

  const info = $derived(store?.state.session)

  // A revert from anywhere (another window, the agent) updates the Changes list at once (UX-79).
  $effect(() => refreshOnRevert(host.api, host.state.desktopId, () => (store ? [store] : [])))

  // The chats of this desktop: chats with the same title get " (2)", " (3)" in the title bar and on the taskbar.
  let chatList = $state.raw<SessionDto[]>([])
  $effect(() => {
    let stale = false
    const load = (): void =>
      void host.api.sessions.list(host.state.desktopId).then(
        (list) => !stale && (chatList = list.filter((c) => c.role === 'chat')),
        () => {}
      )
    load()
    const off = host.api.on('session.changed', load)
    return () => {
      stale = true
      off()
    }
  })
  const ownTitle = $derived(info?.title || session?.title || win.view.title)
  const title = $derived(
    chatTitleLabels(chatList.map((c) => (c.id === sessionId ? { id: c.id, title: ownTitle } : { id: c.id, title: c.title }))).get(sessionId) ?? ownTitle
  )
  const allChanges = $derived(store?.state.changes ?? [])
  // Only what is still uncommitted: a change leaves the list once Git lists its file as clean (folders without Git keep all).
  const uncommitted = useUncommittedChanges(host.api, () => host.state.desktopId, () => allChanges)
  const changes = $derived(uncommitted.list)
  // The files reverted in this chat stay in the list after the pane or the window is closed and opened again (UX-117).
  const revertedChanges = useRevertedChanges(
    host.api,
    () => host.state.desktopId,
    () => [sessionId],
    () => allChanges
  )
  const tasks = $derived(store?.state.tasks ?? [])
  const models = $derived((info?.models.length ? info.models : session?.models) ?? [])
  const modelId = $derived(info?.currentModelId ?? session?.currentModelId ?? '')
  const status = $derived(effectiveStatus(info?.status, session?.status))
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

  // The agent could not start: the chat itself says so, with its own buttons (Try again, Open Agents, Choose another agent,
  // Details), in the transcript. No dialog box covers them (UX-63).

  // ---- reopening a chat: a one-time line, then the composer takes over -----------------------------------------
  let reopened = $state<string | null>(null)
  let reopenChecked = false
  $effect(() => {
    const current = store
    if (!current || reopenChecked) return
    reopenChecked = true
    void current.whenConnected().then(() => {
      if (current.messages.length > 0) reopened = `Reopened '${ownTitle}'. Your earlier messages are kept.`
    })
  })
  $effect(() => {
    if (store && store.messages.length > 0 && store.running) reopened = null
  })

  // ---- the caret goes to the message box when the window opens or comes to the front ----------------------------
  let focusSeq = $state(0)
  /**
   * A text the desktop holds for this window's message box (a new chat that continues a message that failed in another chat, UX-175).
   * Its ids count apart from `focusSeq`, so the box does not mistake one for the other.
   */
  const HOST_PREFILL_BASE = 1_000_000
  const hostPrefill = $derived.by(() => {
    const held = host.prefills?.[win.id]
    return held ? { ...held, id: held.id + HOST_PREFILL_BASE } : null
  })
  $effect(() => {
    if (focused) untrack(() => (focusSeq += 1))
  })

  // ---- closing a chat that still works: it keeps running, and a balloon says where to find it -----------------------
  const desktopShell = (() => {
    try {
      return getDesktopContext().desktop
    } catch {
      return null
    }
  })()
  onDestroy(() => {
    const gone = !host.state.windows.some((w) => w.id === win.id)
    if (gone && store?.running) desktopShell?.showBalloon({ title: 'Agent7', text: `'${ownTitle}' is still running in the background. Open Chats to see it.`, icon: 'info' })
  })

  // The window title follows the chat title.
  $effect(() => {
    if (title && title !== win.view.title) host.updateView(win.id, { app: 'chat', sessionId, title })
  })

  async function revert(change: (typeof changes)[number]): Promise<void> {
    const answer = await showMessageBox({
      text: revertConfirmText(change.path),
      caption: 'Agent7',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.sessions.revertChange(change.id)
      await store?.connect()
      selectedChangeId = null
      lastWasRevert = true
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Agent7', buttons: 'OK', icon: 'error' })
    }
  }

  /** Edit > Undo revert: takes the newest reverted file out of the Recycle Bin (UX-169). It is there while the last thing done to the changes was a revert. */
  let lastWasRevert = $state(false)
  const canUndoRevert = $derived(lastWasRevert && revertedChanges.list.length > 0)
  async function undoRevert(): Promise<void> {
    const newest = revertedChanges.list.at(-1)
    if (!newest) return
    lastWasRevert = false
    try {
      await host.api.recycle.restore(newest.id)
      await store?.connect()
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

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'chat')
  const ctx = new ContextMenu()
  let root = $state<HTMLElement | null>(null)

  /** Puts a quote of the message into the composer (the composer input is the only text box with this test id). */
  function quoteInReply(text: string): void {
    const input = root?.querySelector<HTMLTextAreaElement | HTMLInputElement>('[data-testid="chat-composer-input"]')
    if (!input) return
    input.value = `${input.value ? `${input.value}\n` : ''}${quoteText(text)}`
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
  }

  /** The menu of the element under the pointer (or the focus): Copy message, Copy code, Quote in reply. */
  function contextItems(target: EventTarget | null): MenuItemDef[] {
    const message = target instanceof Element ? target.closest<HTMLElement>('[data-testid^="chat-message"]') : null
    const pre = target instanceof Element ? target.closest('pre') : null
    // Only the words of the message: not the author line ("You") above them.
    const body = message?.querySelector<HTMLElement>('[data-message-body]') ?? message?.querySelector<HTMLElement>('.body')
    return transcriptItems({
      message: (body ?? message)?.innerText.trim() ?? '',
      code: (pre ?? message?.querySelector('pre'))?.textContent?.replace(/\n$/, '') ?? '',
      quote: quoteInReply,
      copy: copyText
    })
  }

  /** "End the agent program..." and "Task Manager...": Task Manager on Processes, where End process stops the program of every chat (UX-176). */
  const openProcesses = (): void => void host.openTaskManager('processes')

  // The status line offers the way to end the program once the chat has worked for a while (UX-176); a request that waits does not count.
  let workedLong = $state(false)
  $effect(() => {
    const working = !!store?.running && !store.pendingInterrupt
    if (!working) {
      workedLong = false
      return
    }
    const timer = setTimeout(() => (workedLong = showNotResponding(NOT_RESPONDING_MS, false)), NOT_RESPONDING_MS)
    return () => clearTimeout(timer)
  })

  /** "New chat" (File menu, Ctrl+N): a new chat on the folder of this one, also when this chat's agent is broken. */
  const newChat = (): Promise<void> => host.startChat(session?.cwd ?? host.state.home)

  /** Ctrl+N works wherever the focus is inside the Chat window. */
  function newChatKey(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'n') return
    event.preventDefault()
    void newChat()
  }

  /** Review changes: asks what to review, with the project drive of this chat preselected. */
  const reviewChanges = (): void => host.chooseReview(session?.cwd)

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'chat-new', testid: 'chat-menu-new', label: 'New &chat', shortcut: 'Ctrl+N', action: () => void newChat() },
          { id: 'chat-end-agent', testid: 'chat-menu-end-agent', label: '&End the agent program...', title: 'Open Task Manager on Processes, where you can end the agent program', disabled: sessionId <= 0, action: openProcesses },
          { separator: true },
          { id: 'chat-clear', testid: 'chat-menu-clear', label: 'Clear &transcript...', disabled: sessionId <= 0, action: () => void clearTranscript() },
          ...closeItems('chat', () => void host.closeWindow(win.id), '&Close', 'Close this window. The agent keeps working.')
        ]
      },
      { label: '&Edit', items: editItems('chat-menu', { copy: () => void document.execCommand('copy'), selectAll: () => void document.execCommand('selectAll') }, { hasSelection: true }).concat(undoRevertItem(canUndoRevert, () => void undoRevert())) },
      {
        label: '&Tools',
        items: [
          { id: 'chat-review', testid: 'chat-menu-review', label: '&Review changes', icon: 'changes', action: reviewChanges },
          { id: 'chat-code', testid: 'chat-menu-code', label: 'Open in &Code', action: () => void host.openApp({ app: 'code', path: host.projectRootOf(session?.cwd) }) },
          { id: 'chat-task-manager', testid: 'chat-menu-task-manager', label: '&Task Manager...', title: 'Open Task Manager to see and end the agent programs', action: openProcesses },
          { separator: true },
          { id: 'chat-events', testid: 'chat-menu-event-viewer', label: '&Event Viewer', icon: 'eventlog', action: () => void host.openEventViewer({ sessionId: sessionId > 0 ? sessionId : null }) }
        ]
      },
      { label: '&View', items: [{ id: 'chat-details', testid: 'chat-menu-details', label: 'Show &thinking and tool details', checked: transcriptDetail.showAll, action: () => transcriptDetail.toggle() }, { separator: true }, { id: 'chat-panel', testid: 'chat-menu-panel', label: '&Changes', checked: panelOpen, action: () => (panelOpen = !panelOpen) }] },
      help.menu()
    ])
  )

  const setModel = (id: string): void => void host.api.sessions.setModel(sessionId, id)
  const setMode = (id: number, modeId: string): Promise<void> => host.api.sessions.setMode(id, modeId)
  const pickFiles = (): Promise<string[]> => host.api.dialogs.pickFiles()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="chat"
  data-testid="chat-app"
  data-session-id={sessionId}
  bind:this={root}
  oncontextmenu={(e) => ctx.show(e, contextItems(e.target))}
  onkeydown={(e) => {
    newChatKey(e)
    ctx.key(e, () => contextItems(e.target))
  }}
>
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
    <ToolStripButton icon="changes" text={changes.length > 0 ? `Changes (${changes.length})` : 'Changes'} bind:checked={panelOpen} checkOnClick title="Changes the agent made: review, revert" data-testid="chat-panel-toggle" />
  </div>
  <div class="row">
    <div class="main">
      {#if reopened}
        <div class="reopened" role="status" data-testid="chat-reopened-note">
          <span>{reopened}</span>
          <button type="button" class="dismiss" data-testid="chat-reopened-dismiss" aria-label="Dismiss" title="Dismiss" onclick={() => (reopened = null)}>x</button>
        </div>
      {/if}
      <EmbeddedChat {host} {sessionId} role="chat" {openFilePath} {setMode} {pickFiles} {surfaceControls} prefill={hostPrefill ?? { id: focusSeq }} onprefilled={(id) => host.prefillApplied?.(win.id, id - HOST_PREFILL_BASE)} contained bind:store bind:session bind:agent />
    </div>
    <SurfaceSidebar
      surfaces={sidebarSurfaces}
      {sessionId}
      selected={sidebarSelected}
      bind:width={sidebarWidth}
      onselect={(id) => (sidebarSelected = id)}
      onclose={(s) => surfaceControls.close(s)}
      onaction={(event) => void store?.sendA2uiAction(event)}
      running={store?.running}
      reply={lastReply(store?.messages ?? [])}
    />
    {#if panelOpen}
      <aside class="side" data-testid="chat-side-panel" aria-label="Changes and tasks">
        <TabControl {tabs} bind:selected={panelTab} aria-label="Inspector">
          {#snippet panel(tab)}
            {#if tab.id === 'changes'}
              <ChangesPane
                {changes}
                reverted={revertedChanges.list}
                layoutKey={`chat-${sessionId}`}
                bind:selectedId={selectedChangeId}
                onrevert={(c) => revert(c)}
                onopenrecyclebin={(id) => void openRecycleBin(host, id)}
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
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Chat" />
  <AppAbout {help} />
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="chat-cwd" spring><span title={folder?.path} data-testid={problemLine ? 'chat-problem-line' : undefined}>{problemLine ?? where}</span></StatusStripLabel>
    {#if session}
      <StatusStripLabel borders={['left']}>
        <span>Context</span>
        <ProgressBar width={80} value={percent} label="Context used" />
        <span class="pct">{percent}%</span>
      </StatusStripLabel>
    {/if}
    {#if workedLong}
      <StatusStripLabel borders={['left']}>
        <button type="button" class="reconnect" data-testid="chat-end-agent-link" title={NOT_RESPONDING_TIP} onclick={openProcesses}>{NOT_RESPONDING_LINK}</button>
      </StatusStripLabel>
    {/if}
    <StatusStripLabel testid="chat-status" text={connectionLabel(status, host.state.userInControl)} borders={['left']} />
    {#if isDisconnected(status)}
      <StatusStripLabel borders={['left']}>
        <button type="button" class="reconnect" data-testid="chat-reconnect" title="Start the agent again" onclick={() => void store?.reconnect()}>Reconnect</button>
      </StatusStripLabel>
    {/if}
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
    width: 330px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 4px 4px 0;
  }
  .reopened {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    padding: 2px 6px;
    color: #1e3287;
    background: #eef4fc;
    border: 1px solid #b8cbe6;
  }
  .reopened span {
    flex: 1;
  }
  .dismiss,
  .reconnect {
    padding: 0 6px;
    border: 1px solid #9aa9bf;
    border-radius: 2px;
    background: linear-gradient(#fdfeff, #e6eef8);
    font: inherit;
  }
  .pct {
    min-width: 30px;
    text-align: right;
  }
</style>
