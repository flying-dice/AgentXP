<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { effectiveStatus, isStarting } from '../sessionStatus'
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import Composer from './Composer.svelte'
  import type { ChatSuggestion } from './chatPaneText'
  import { RESTARTED_NOTE, describeProblem, sendStateOf, type ProblemActionId, type SendState } from './chatProblem'
  import PermissionDialog from './PermissionDialog.svelte'
  import { PAUSED_NOTE, STOPPED_BY_PAUSE_NOTE } from './resumeNote'
  import { permissionMetadata } from './permissionOptions'
  import SessionHeader from './SessionHeader.svelte'
  import type { SessionStoreLike } from './SessionStoreLike'
  import type { SurfaceControls } from './surfaceRow'
  import { RESTART_DONE_MS } from './chatProblem'
  import Transcript from './Transcript.svelte'

  interface Props {
    store: SessionStoreLike
    session: SessionDto
    folder: FolderDto | null
    /** Where the chat works as a person says it ("login-app (E:)"); the header shows it, its tooltip the full path. */
    folderText?: string
    agent: AgentDto | null
    /** The file open in the editor, offered by "Include open file". */
    openFilePath?: string | null
    /** Overrides for the IPC calls (stories, tests); default to `window.agent7`. */
    setMode?: (sessionId: number, modeId: string) => Promise<void>
    pickFiles?: () => Promise<string[]>
    /** Show permission requests inside this view (a desktop window) instead of over the whole viewport. */
    contained?: boolean
    /** Open, close, delete and move for the surface rows (the Chat app). */
    surfaceControls?: SurfaceControls
    /** Without the title bar (a host such as the embedded chat panel shows its own). */
    compact?: boolean
    /** Chips above the composer (the chat pane): clicking one sends its `text`. */
    suggestions?: readonly ChatSuggestion[]
    /** See `Composer`: fills and focuses the box. */
    prefill?: { id: number; text?: string } | null
    onprefilled?: (id: number) => void
    /** A short composer (the chat pane). */
    dense?: boolean
    /** The desktop is paused: a banner above the message box says so. */
    paused?: boolean
    /** Pause stopped a step of this chat (the saved list of the desktop): the banner says it continues on Resume. */
    stoppedByPause?: boolean
    /** The desktop's "Ask before every action" state, shown (and switched) in the Mode menu. */
    askFirst?: boolean
    onaskfirst?: (on: boolean) => void
    /** "Details..." of the error row: the technical text and the last lines of the log, shown inline under the buttons. */
    loadDetails?: (detail: string | null) => Promise<string>
    /** "Show in Event Viewer" of the error row. */
    onshowevents?: () => void
    /** "Show in Event Viewer" under a failed step: opens the viewer on the event of that tool call. */
    onshowtoolevent?: (toolCallId: string) => void
    /** "Open Agents" and "Choose another agent" of the error row: Control Center at Agents. */
    onopenagents?: () => void
    /** "Start a new chat" after a second failure in a row. */
    onnewchat?: () => void
    /** The name of the desktop's default agent when the chat's own agent is another one: "Try again with <name>". */
    newDefaultAgent?: string | null
  }

  let {
    store,
    session,
    folder,
    folderText,
    agent,
    openFilePath = null,
    setMode = (id, modeId) => window.agent7.sessions.setMode(id, modeId),
    pickFiles = () => window.agent7.dialogs.pickFiles(),
    contained = false,
    surfaceControls,
    compact = false,
    suggestions = [],
    prefill = null,
    onprefilled,
    dense = false,
    paused = false,
    stoppedByPause = false,
    askFirst = false,
    onaskfirst,
    loadDetails,
    onshowevents,
    onshowtoolevent,
    onopenagents,
    onnewchat,
    newDefaultAgent = null
  }: Props = $props()

  const agentName = $derived(agent?.name ?? 'The agent')
  const info = $derived(store.state.session)
  const title = $derived(info.title || session.title)
  const modes = $derived(info.modes.length > 0 ? info.modes : session.modes)
  const modeId = $derived(info.currentModeId ?? session.currentModeId)
  const request = $derived(store.pendingInterrupt)
  const permission = $derived(request ? permissionMetadata(request.metadata) : null)
  const waitingToolCallId = $derived(request?.toolCallId ?? null)
  const starting = $derived(isStarting(effectiveStatus(info.status, session.status)))

  // ---- what went wrong: the error row, the state of the failed message -------------------------------------
  const problem = $derived(describeProblem({ error: store.error, problem: session.problem, failed: store.failedSend, newDefaultAgent, agentName: agent?.name }))
  const sendStates = $derived.by((): ReadonlyMap<string, SendState> => {
    const failed = store.failedSend
    return failed ? new Map([[failed.messageId, sendStateOf(failed.messageId, failed, !!session.problem)]]) : new Map()
  })

  /** "Details...": opens the technical text under the buttons, or closes it. */
  let detailsText = $state<string | null>(null)
  async function toggleDetails(): Promise<void> {
    if (detailsText !== null) {
      detailsText = null
      return
    }
    const detail = problem?.detail ?? null
    detailsText = loadDetails ? await loadDetails(detail) : (detail ?? 'There is nothing more to show.')
  }
  // A new problem starts with its details closed.
  $effect(() => {
    void problem?.text
    untrack(() => (detailsText = null))
  })

  /** A restart shows "Restarting the agent..." with progress, then "The agent is running again." for a moment. */
  let restart = $state<'working' | 'done' | null>(null)
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  onDestroy(() => {
    if (restartTimer) clearTimeout(restartTimer)
  })
  /** Starts a new agent program; `then` runs once it is up (sending the message again). */
  async function restartThen(then?: () => Promise<unknown>): Promise<void> {
    if (restart === 'working') return
    if (restartTimer) clearTimeout(restartTimer)
    restart = 'working'
    await store.reconnect()
    const up = !session.problem && !store.error
    restart = up ? 'done' : null
    if (up) restartTimer = setTimeout(() => (restart = null), RESTART_DONE_MS)
    if (up && then) await then()
  }

  function onproblem(id: ProblemActionId): void {
    if (id === 'send-again') void (session.problem ? restartThen(resendFailed) : resendFailed())
    else if (id === 'restart-send') void restartThen(resendFailed)
    else if (id === 'restart') void restartThen(store.failedSend ? putBack : undefined)
    else if (id === 'details') void toggleDetails()
    else if (id === 'open-agents' || id === 'choose-agent') onopenagents?.()
    else if (id === 'new-chat') onnewchat?.()
    else onshowevents?.()
  }

  /**
   * "Send again" and "Restart and send again": the message goes out once more, so the draft that came back into the message box
   * when it failed is emptied (a text typed after the failure stays).
   */
  async function resendFailed(): Promise<boolean> {
    const text = store.failedSend?.text
    if (text !== undefined) edit = { id: --editSeq, clearIf: text }
    return store.resend()
  }

  /** After "Restart": the message that was not answered goes back into the message box, and a line says to press Send. */
  let restartedNote = $state(false)
  async function putBack(): Promise<void> {
    restartedNote = await editFailed()
  }
  // The line goes away with the next send or the next problem.
  $effect(() => {
    if (store.running || problem) untrack(() => (restartedNote = false))
  })

  /** "Edit" on a message that was not sent: the text goes back into the message box. */
  /** What the message box is told to do: hold a text again ("Edit"), or empty itself of a message that went out again. */
  let edit = $state<{ id: number; text?: string; clearIf?: string } | null>(null)
  let editSeq = 0
  async function editFailed(): Promise<boolean> {
    const failed = await store.takeBack()
    if (failed) edit = { id: --editSeq, text: failed.text }
    return !!failed
  }
</script>

<section class="session-view" aria-label={title}>
  {#if !compact}<SessionHeader {title} path={folderText ?? folder?.path} fullPath={folder?.path} />{/if}
  <Transcript
    messages={store.messages}
    agentState={store.state}
    activities={store.activities}
    sessionId={session.id}
    {agentName}
    folderName={folder?.name ?? ''}
    running={store.running}
    {problem}
    {onproblem}
    problemDetails={detailsText}
    {restart}
    {sendStates}
    onresend={() => onproblem('send-again')}
    onedit={() => void editFailed()}
    stopped={store.stoppedByUser}
    {waitingToolCallId}
    deniedToolCalls={store.deniedToolCalls}
    onaction={(event) => void store.sendA2uiAction(event)}
    {surfaceControls}
    {onshowtoolevent}
  />
  {#if suggestions.length > 0 && !store.running && !request}
    <div class="chips" data-testid="embedded-chat-suggestions" role="group" aria-label="Suggestions">
      {#each suggestions as s (s.id)}
        <button type="button" class="chip" class:off={s.disabled} data-testid="embedded-chat-suggestion" data-suggestion={s.id} aria-disabled={s.disabled || undefined} title={s.tip} onclick={() => !s.disabled && void store.send(s.text)}>{s.label}</button>
      {/each}
    </div>
  {/if}
  {#if store.lastDecision}
    <div class="decision" role="status" data-testid="chat-permission-result" data-allowed={store.lastDecision.allowed}>{store.lastDecision.text}</div>
  {/if}
  {#if restartedNote}
    <div class="decision" role="status" data-testid="chat-restarted-note">{RESTARTED_NOTE}</div>
  {/if}
  {#if paused}
    <div class="paused" role="status" data-testid="chat-paused-banner" data-stopped={stoppedByPause}>{stoppedByPause ? STOPPED_BY_PAUSE_NOTE : PAUSED_NOTE}</div>
  {/if}
  <Composer
    {agentName}
    prefill={edit ?? prefill}
    onprefilled={(id) => (id < 0 ? undefined : onprefilled?.(id))}
    {dense}
    {starting}
    {askFirst}
    {onaskfirst}
    running={store.running}
    {modes}
    {modeId}
    {openFilePath}
    onsend={(text, files) => store.send(text, files)}
    oncancel={() => void store.cancel()}
    onmode={(id) => void setMode(session.id, id)}
    {pickFiles}
  />
  {#if request && permission}
    {#key request.id}
      <PermissionDialog
        {agentName}
        title={permission.title}
        options={permission.options}
        toolCall={request.toolCallId ? store.state.toolCalls[request.toolCallId] : undefined}
        {contained}
        onanswer={(optionId) => void store.resolveInterrupt(optionId, request.id)}
      />
    {/key}
  {/if}
</section>

<style>
  .chips {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .chip {
    min-height: 24px;
    min-width: 24px;
    padding: 1px 8px;
    border: 1px solid #9aa9bf;
    border-radius: 9px;
    background: linear-gradient(#fdfeff, #e6eef8);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .decision {
    flex: none;
    margin-top: 4px;
    padding: 3px 8px;
    border: 1px solid #b9c7da;
    background: #f4f7fb;
    color: #1d3a63;
  }
  .paused {
    flex: none;
    margin-top: 4px;
    padding: 3px 8px;
    border: 1px solid #e0c97a;
    background: #fffbe6;
    color: #4a3b00;
  }
  .chip:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .chip.off,
  .chip.off:hover {
    border-color: #c5ccd6;
    background: #f1f3f6;
    color: #7a8494;
    cursor: default;
  }
  .session-view {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
</style>
