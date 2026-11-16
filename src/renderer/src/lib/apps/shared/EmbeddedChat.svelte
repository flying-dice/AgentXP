<script lang="ts">
  /**
   * The embedded chat panel: THE consistent right-hand aside every app can host (manuals/embedded-chat.md).
   *
   * It wraps `SessionView` (transcript, composer, permission dialog) and owns what a host would otherwise repeat:
   * loading the session row and its agent, following `session.changed`, and the shared `SessionAgentStore` of the
   * desktop (`useSessionStores`, so the Action Center and a Chat window of the same session answer through the very
   * same store). The host decides which session it shows (the review session of Code Review, a short-lived `aside`
   * session of another app, or a chat) and what app context rides along with every prompt (`contextProvider`).
   *
   * Collapsible: with `collapsible` the panel has a header with a collapse button; collapsed it is a 26 px strip
   * that expands again. `collapsed` and `width` are bindable so the host can remember them.
   *
   * The chat pane of an app window (role `aside`, hosted by the shell: `lib/desktop/AppChatPane.svelte`) adds: a session
   * that does not exist yet (`onstart` creates it on the first message, so the panel shows a composer and chips first),
   * "New conversation" (`onnew`), suggestion chips and `prefill` (fills and focuses the composer).
   */
  import { untrack } from 'svelte'
  import { DESKTOP_CONTEXT_DESCRIPTION } from '@shared/desktop'
  import type { AgentDto, FolderDto, SessionDto, SessionRole } from '@shared/models'
  import type { SessionAgentStore } from '../../agui/SessionAgentStore.svelte'
  import { connectionLabel, effectiveStatus, isDisconnected } from '../../app/sessionStatus'
  import { OPEN_PANE_TIP, PANE_EMPTY_TEXT } from '../../app/session/chatPaneText'
  import { logLines, problemDetails } from '../../app/session/chatProblem'
  import { folderLabel } from '../../app/session/folderLabel'
  import Composer from '../../app/session/Composer.svelte'
  import SessionView from '../../app/session/SessionView.svelte'
  import type { SurfaceControls } from '../../app/session/surfaceRow'
  import Icon from '../../kit/atoms/Icon.svelte'
  import { cwdLabel } from '../explorer/explorerModel'
  import { useSessionStores } from '../sessionStores.svelte'
  import type { DesktopHost } from '../types'

  interface Props {
    host: DesktopHost
    /** The session to show; 0 or less shows "no session yet". */
    sessionId: number
    /**
     * The app's context for every prompt sent from this panel: the open file, the selection, the state. It is added to
     * the desktop context the agent already gets, under `appContext` (null or undefined: nothing extra).
     */
    contextProvider?: () => Record<string, unknown> | null | undefined
    /** No title bar inside (the panel header or the window already says what it is). */
    compact?: boolean
    /** What the session is for; it is only a label of the root element (`data-role`). Default `aside`. */
    role?: SessionRole
    /** Shows a header with a collapse button. */
    collapsible?: boolean
    collapsed?: boolean
    /** Panel width in px; a drag handle on its left edge resizes it (only when `resizable`). */
    width?: number
    resizable?: boolean
    /** Header text; default: the session title. */
    title?: string
    /** "Open as a chat window" under the header (the chat pane): starts a chat of its own on the same folder. */
    onopenwindow?: () => void
    /** The text of the empty pane (no session yet); the chat pane says what it is and what to use for a lasting chat. */
    blankText?: string
    /** The file open in the host, offered by "Include open file" in the composer. */
    openFilePath?: string | null
    /** Open, close, delete and move for the surface rows (the Chat app). */
    surfaceControls?: SurfaceControls
    /** Show permission requests inside this panel's window instead of over the whole viewport. */
    contained?: boolean
    setMode?: (sessionId: number, modeId: string) => Promise<void>
    pickFiles?: () => Promise<string[]>
    /** The shared store of the session, once it exists (bind to read messages or send a prompt from the host). */
    store?: SessionAgentStore | null
    /** The session row, once loaded. */
    session?: SessionDto | null
    /**
     * Without a session (`sessionId` 0) the panel shows a composer; the first message calls this to create the session
     * (resolves with its id) and is sent to it. Without `onstart` the panel just says there is no session yet.
     */
    onstart?: () => Promise<number>
    /** "New conversation" in the header (only with a session): the host deletes the session, the panel goes blank. */
    onnew?: () => void | Promise<void>
    /** Chips above the composer; clicking one sends its text. */
    suggestions?: readonly { id: string; label: string; text: string }[]
    /** Fills and focuses the composer (see `Composer`). */
    prefill?: { id: number; text?: string } | null
    onprefilled?: (id: number) => void
  }

  let {
    host,
    sessionId,
    contextProvider,
    compact = false,
    role = 'aside',
    collapsible = false,
    collapsed = $bindable(false),
    width = $bindable(340),
    resizable = false,
    title,
    onopenwindow,
    blankText,
    openFilePath = null,
    surfaceControls,
    contained = true,
    setMode,
    pickFiles,
    store = $bindable(null),
    session = $bindable(null),
    onstart,
    onnew,
    suggestions = [],
    prefill = null,
    onprefilled
  }: Props = $props()

  // svelte-ignore state_referenced_locally
  const stores = useSessionStores(host)
  $effect(() => {
    if (sessionId > 0) untrack(() => stores.open(sessionId))
  })
  const shared = $derived(sessionId > 0 ? (stores.peek(sessionId) ?? null) : null)
  $effect(() => {
    store = shared
  })

  let agents = $state.raw<AgentDto[]>([])
  let loadError = $state<string | null>(null)
  // Derived, so a chat that moved to another agent ("Try again with <agent>") shows the new one.
  const agent = $derived(agents.find((a) => a.id === session?.agentId) ?? null)
  /** The desktop's default agent when it is not this chat's agent: the Try again button of a failed start names it. */
  const newDefaultAgent = $derived.by(() => {
    const standard = agents.find((a) => a.isDefault)
    return standard && session && standard.id !== session.agentId ? standard.name : null
  })

  // The row of the session and its agent, followed through `session.changed`.
  $effect(() => {
    const id = sessionId
    if (id <= 0) return
    let stale = false
    void (async () => {
      try {
        const [s, list] = await Promise.all([host.api.sessions.get(id), host.api.agents.list()])
        if (stale) return
        session = s
        agents = list
        loadError = null
      } catch (error) {
        if (stale) return
        session = null
        loadError = error instanceof Error ? error.message : String(error)
      }
    })()
    const off = host.api.on('session.changed', (changed) => {
      if (changed.id !== id) return
      // The default agent can change in Control Center while a failed chat waits, and a chat can move to another agent
      // (Try again with the new default): read the agents again when the chat's state changes.
      if (session && (changed.agentId !== session.agentId || changed.problem?.failures !== session.problem?.failures || !!changed.problem !== !!session.problem)) {
        void host.api.agents.list().then((list) => (agents = list))
      }
      session = changed
    })
    return () => {
      stale = true
      off()
    }
  })

  // A chat with a failed agent follows the default agent: coming back from Control Center (focus moves) reads the list again.
  $effect(() => {
    void host.state.focusedWindowId
    if (untrack(() => sessionId > 0 && !!session?.problem)) void host.api.agents.list().then((list) => (agents = list))
  })

  // The host's context rides with every run of this session: desktop state plus `appContext`.
  function provide(target: SessionAgentStore): () => void {
    if (!contextProvider) return () => {}
    const previous = target.contextProvider
    target.contextProvider = () => [
      { description: DESKTOP_CONTEXT_DESCRIPTION, value: JSON.stringify({ ...host.state, appContext: contextProvider() ?? undefined }) }
    ]
    return () => {
      if (target.contextProvider) target.contextProvider = previous
    }
  }
  $effect(() => {
    const target = shared
    if (!target) return
    return provide(target)
  })

  let starting = $state(false)
  let startError = $state<string | null>(null)
  /** The first message of a panel without a session: create the session, then send. */
  async function startAndSend(text: string, files: string[] = []): Promise<void> {
    if (!onstart || starting) return
    starting = true
    startError = null
    try {
      const id = await onstart()
      const created = stores.open(id)
      provide(created)
      await created.send(text, files)
    } catch (error) {
      startError = error instanceof Error ? error.message : String(error)
    } finally {
      starting = false
    }
  }
  const suggestionsOpen = $derived(suggestions.length > 0 && !starting)

  const folder = $derived<FolderDto | null>(session ? { id: 0, name: cwdLabel(session.cwd, host.state.drives), path: session.cwd, lastOpenedAt: null } : null)
  const folderText = $derived(session ? folderLabel(session.cwd, host.state.drives) : undefined)

  /** "Details...": the technical text of the error and the last lines of the chat's log, shown inline in the chat. */
  async function loadDetails(detail: string | null): Promise<string> {
    const events = await host.api.events.query({ desktopId: host.state.desktopId, sessionId, limit: 200 }).catch(() => [])
    return problemDetails(detail, logLines(events))
  }
  /** "Open Agents" and "Choose another agent": Control Center at Agents (the chat stays where it is). */
  async function openAgents(): Promise<void> {
    const centre = await host.openApp({ app: 'control-centre' })
    host.updateView(centre.id, { app: 'control-centre', page: 'agents' })
  }
  /** "Start a new chat" after a second failure: a chat on the same folder with the current default agent. */
  const startNewChat = (): void => void (session ? host.startChat(session.cwd) : undefined)
  async function showInEventViewer(): Promise<void> {
    const viewer = await host.openApp({ app: 'event-viewer' })
    host.updateView(viewer.id, { app: 'event-viewer', sessionId, level: 'all', selectedEventId: null })
  }
  const setAskFirst = (on: boolean): void => void host.api.desktop.setUserInControl(host.state.desktopId, on)
  /** "Reconnect" of a chat that lost its agent: a fresh agent program, then the chat loads again. */
  const reconnect = (): void => void shared?.reconnect()

  const heading = $derived(title ?? shared?.state.session.title ?? session?.title ?? 'Chat')
  const status = $derived(effectiveStatus(shared?.state.session.status, session?.status))

  function startResize(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = width
    const move = (e: PointerEvent): void => void (width = Math.min(720, Math.max(260, startWidth + (startX - e.clientX))))
    const stop = (): void => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', stop)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', stop)
  }

  function resizeKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') width = Math.min(720, width + 16)
    else if (event.key === 'ArrowRight') width = Math.max(260, width - 16)
    else return
    event.preventDefault()
  }
</script>

{#if collapsible && collapsed}
  <aside class="strip" data-testid="embedded-chat" data-role={role} data-session-id={sessionId} data-collapsed="true" aria-label="Chat pane (collapsed)">
    <button type="button" class="expand" data-testid="embedded-chat-toggle" aria-label="Show chat" title={OPEN_PANE_TIP} onclick={() => (collapsed = false)}>
      <Icon name="chevron-left" />
    </button>
    <span class="vertical">{heading}</span>
  </aside>
{:else}
  {#if resizable}
    <div class="resizer" data-testid="embedded-chat-resizer" role="slider" aria-orientation="horizontal" aria-valuemin={260} aria-valuemax={720} aria-valuenow={width} aria-label="Chat pane width" tabindex="0" onpointerdown={startResize} onkeydown={resizeKey}></div>
  {/if}
  <aside class="panel" class:padded={collapsible || resizable} data-testid="embedded-chat" data-role={role} data-session-id={sessionId} data-collapsed="false" style={resizable || collapsible ? `width:${width}px` : undefined} aria-label="Chat pane">
    {#if collapsible}
      <div class="head">
        <Icon name="session" size={16} />
        <b class="heading" data-testid="embedded-chat-title" title={heading}>{heading}</b>
        <span class="state" data-testid="embedded-chat-status">{connectionLabel(starting ? 'connecting' : status, host.state.userInControl)}</span>
        {#if isDisconnected(status) && sessionId > 0}
          <button type="button" class="reconnect" data-testid="embedded-chat-reconnect" title="Start the agent again" onclick={reconnect}>Reconnect</button>
        {/if}
        {#if onnew && sessionId > 0}
          <button type="button" class="collapse" data-testid="embedded-chat-new" aria-label="New conversation" title="New conversation: deletes this one" onclick={() => void onnew?.()}>
            <Icon name="refresh" />
          </button>
        {/if}
        <button type="button" class="collapse" data-testid="embedded-chat-toggle" aria-label="Hide chat" title="Hide chat" onclick={() => (collapsed = true)}>
          <Icon name="chevron-right" />
        </button>
      </div>
      {#if onopenwindow}
        <div class="sub">
          <button type="button" class="link" data-testid="embedded-chat-open-window" title="Start a chat in its own window on the same folder. You can come back to it later." onclick={() => onopenwindow?.()}>Open as a chat window</button>
        </div>
      {/if}
    {/if}
    <div class="body">
      {#if shared && session}
        {#key sessionId}
          <SessionView store={shared} {session} {folder} {folderText} {agent} paused={host.state.paused} stoppedByPause={host.stoppedByPause(sessionId)} askFirst={host.state.userInControl} onaskfirst={setAskFirst} {loadDetails} onshowevents={() => void showInEventViewer()} onopenagents={() => void openAgents()} onnewchat={startNewChat} {newDefaultAgent} {openFilePath} {setMode} {pickFiles} {surfaceControls} {contained} compact={compact || collapsible} {suggestions} {prefill} {onprefilled} dense={role === 'aside'} />
        {/key}
      {:else if sessionId <= 0 && onstart}
        <div class="blank start" data-testid="embedded-chat-blank">{startError ?? (starting ? 'Starting...' : (blankText ?? PANE_EMPTY_TEXT))}</div>
        {#if suggestionsOpen}
          <div class="chips" data-testid="embedded-chat-suggestions" role="group" aria-label="Suggestions">
            {#each suggestions as s (s.id)}
              <button type="button" class="chip" data-testid="embedded-chat-suggestion" data-suggestion={s.id} onclick={() => void startAndSend(s.text)}>{s.label}</button>
            {/each}
          </div>
        {/if}
        <Composer agentName="the agent" running={starting} {prefill} {onprefilled} dense={role === 'aside'} {pickFiles} onsend={(text, files) => void startAndSend(text, files)} />
      {:else}
        <div class="blank" data-testid="embedded-chat-blank">{loadError ?? (sessionId > 0 ? 'Opening the chat...' : 'This chat has no session yet.')}</div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .panel[style] {
    flex: none;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .padded .body {
    padding: 4px;
  }
  .head {
    flex: none;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 0 6px;
    background: linear-gradient(#f9fbfd, #e4ecf6);
    border-bottom: 1px solid #9aa9bf;
  }
  .heading {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .state {
    color: var(--w7-text-muted);
    font-size: 11px;
  }
  .reconnect {
    flex: none;
    height: 18px;
    padding: 0 6px;
    border: 1px solid #9aa9bf;
    border-radius: 2px;
    background: linear-gradient(#fdfeff, #e6eef8);
    font: inherit;
    font-size: 11px;
  }
  .reconnect:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .collapse,
  .expand {
    flex: none;
    width: 24px;
    height: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
  }
  .collapse:hover,
  .expand:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .sub {
    flex: none;
    padding: 2px 6px;
    background: #f3f7fc;
    border-bottom: 1px solid #c5d1e1;
    font-size: 11px;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: #0b4aa6;
    font: inherit;
    cursor: pointer;
  }
  .link:hover {
    text-decoration: underline;
  }
  .link:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: 1px;
  }
  .strip {
    flex: none;
    width: 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding-top: 4px;
    background: linear-gradient(90deg, #f9fbfd, #e4ecf6);
    border-left: 1px solid #9aa9bf;
  }
  .vertical {
    writing-mode: vertical-rl;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 260px;
    color: var(--w7-text-muted);
  }
  .resizer {
    flex: none;
    width: 5px;
    cursor: col-resize;
    background: transparent;
  }
  .resizer:hover,
  .resizer:focus-visible {
    background: var(--w7-panel-border);
  }
  .start {
    flex: 1;
  }
  .chips {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .chip {
    padding: 1px 8px;
    border: 1px solid #9aa9bf;
    border-radius: 9px;
    background: linear-gradient(#fdfeff, #e6eef8);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .chip:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .blank {
    flex: 1;
    padding: 8px;
    color: var(--w7-text-muted);
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
</style>
