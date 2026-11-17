<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { effectiveStatus, isStarting } from '../sessionStatus'
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import Composer from './Composer.svelte'
  import type { ChatSuggestion } from './chatPaneText'
  import { describeProblem, sendStateOf, ENDED_SEND_OFF, type ProblemActionId, type SendState } from './chatProblem'
  import { settleStaleSteps } from './staleSteps'
  import { PAUSED_NOTE, STOPPED_BY_PAUSE_NOTE } from './resumeNote'
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
    /** Overrides for the IPC calls (stories, tests); default to `window.agentxp`. */
    setMode?: (sessionId: number, modeId: string) => Promise<void>
    pickFiles?: () => Promise<string[]>
    /** Not used any more (permission requests pop up over the desktop). Kept so hosts need no change. */
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
    /** "Start a new chat" of the error row: the host opens a chat on the same folder and puts `text` (the message that failed) in its message box. */
    onnewchat?: (text?: string) => void
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
    setMode = (id, modeId) => window.agentxp.sessions.setMode(id, modeId),
    pickFiles = () => window.agentxp.dialogs.pickFiles(),
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
  const waitingToolCallId = $derived(request?.toolCallId ?? null)
  const starting = $derived(isStarting(effectiveStatus(info.status, session.status)))

  // ---- what went wrong: the error row, the state of the failed message -------------------------------------
  const problem = $derived(describeProblem({ error: store.error, problem: session.problem, failed: store.failedSend, newDefaultAgent, agentName: agent?.name }))
  /** The user ended the agent program: the box is not refilled and Send is off until the agent runs again (UX-201). */
  const ended = $derived(session.problem?.kind === 'agent-ended')
  const sendStates = $derived.by((): ReadonlyMap<string, SendState> => {
    const failed = store.failedSend
    const marks = { stoppedIds: store.stoppedIds, resentIds: store.resentIds }
    const ids = new Set([...(failed ? [failed.messageId] : []), ...(marks.stoppedIds ?? []), ...(marks.resentIds ?? [])])
    // After the user's own end the cut-off message says Stopped, not "Not sent": the program was ended, the message did not fail.
    return new Map([...ids].map((id) => [id, ended && id === failed?.messageId ? 'stopped' : sendStateOf(id, failed, !!(session.problem || store.error), marks)]))
  })
  /** A step still "Running" while no turn runs belongs to a cut-off turn; it shows as Cancelled. */
  const settledState = $derived(settleStaleSteps(store.state, store.running, !!request))

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
    const kept = store.failedSend
    // After the user's own end of the program nothing is resent, and nothing is said about a request (UX-201).
    const userEnded = session.problem?.kind === 'agent-ended'
    await store.reconnect({ announce: !userEnded })
    const up = !session.problem && !store.error
    restart = up ? 'done' : null
    if (up) restartTimer = setTimeout(() => (restart = null), RESTART_DONE_MS)
    if (up && then) {
      resentNote = true
      await then()
    }
    // A request that stays unsent is said so in the chat, with a button that sends it again (nothing is sent by itself).
    else if (up && kept && !userEnded) restartedRequest = kept.text
  }

  function onproblem(id: ProblemActionId): void {
    if (id === 'send-again') void (session.problem ? restartThen(resendFailed) : resendFailed())
    else if (id === 'restart-send') void restartThen(resendFailed)
    else if (id === 'restart') void restartThen()
    else if (id === 'details') void toggleDetails()
    else if (id === 'open-agents' || id === 'choose-agent') onopenagents?.()
    else if (id === 'new-chat') startNewChat()
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

  /** After "Restart" with a request that was not sent again: the text the line in the chat quotes (null: no line). */
  let restartedRequest = $state<string | null>(null)
  /** The line goes away with the next send, the next problem, or when there is no failed request left to send. */
  const restartedShown = $derived(store.failedSend && !ended ? (restartedRequest ?? store.notResent ?? null) : null)
  $effect(() => {
    if (store.running || problem) untrack(() => (restartedRequest = null))
  })
  /** "Your request was sent again." after "Restart and send again": the line stays until the next message (UX-201). */
  let resentNote = $state(false)
  $effect(() => {
    if (problem) untrack(() => (resentNote = false))
  })
  function resendRestarted(): void {
    restartedRequest = null
    void resendFailed()
  }

  /**
   * "Start a new chat": the text of the failed message goes to the message box of the new chat, so that Enter sends it there (UX-175),
   * and this chat's box is emptied when it still holds that text. This chat keeps its error and says "Continued in a new chat".
   */
  const continued = $derived(!!store.continued)
  function startNewChat(): void {
    const text = store.failedSend?.text
    if (text !== undefined) edit = { id: --editSeq, clearIf: text }
    store.markContinued?.()
    onnewchat?.(text)
  }

  /**
   * The message box gets its draft back only when the message was never answered. A message the agent had started on stays in the
   * chat (marked Stopped), and after the user's own end of the program the box stays empty (UX-201).
   */
  async function sendMessage(text: string, files: string[]): Promise<boolean> {
    resentNote = false
    const sent = await store.send(text, files)
    if (sent) return true
    const failed = store.failedSend
    if (!failed) return false
    return !(failed.unanswered && session.problem?.kind !== 'agent-ended')
  }
  // The end can be reported after the send returned: the draft that came back is taken out of the box again.
  $effect(() => {
    if (!ended) return
    untrack(() => {
      const text = store.failedSend?.text
      if (text !== undefined) edit = { id: --editSeq, clearIf: text }
    })
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
    agentState={settledState}
    activities={store.activities}
    sessionId={session.id}
    {agentName}
    folderName={folder?.name ?? ''}
    running={store.running}
    problem={continued ? null : problem}
    {onproblem}
    problemDetails={detailsText}
    {restart}
    restartedRequest={restartedShown}
    onresendrestarted={resendRestarted}
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
  {#if continued}
    <div class="continued" role="status" data-testid="chat-continued-note">Continued in a new chat.</div>
  {/if}
  {#if resentNote && !problem && !continued}
    <div class="decision" role="status" data-testid="chat-resent-note">Your request was sent again.</div>
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
    retry={!!store.failedSend?.unanswered && !ended}
    blocked={ended ? ENDED_SEND_OFF : null}
    running={store.running}
    {modes}
    {modeId}
    {openFilePath}
    onsend={sendMessage}
    oncancel={() => void store.cancel()}
    onmode={(id) => void setMode(session.id, id)}
    {pickFiles}
  />
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
    background: linear-gradient(#fff, #e6eef8);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .decision {
    flex: none;
    margin-top: 4px;
    padding: 3px 8px;
    border: 1px solid #b9c7da;
    background: #f4f2e8;
    color: #1d3a63;
  }
  .continued {
    flex: none;
    margin-top: 4px;
    padding: 3px 8px;
    border: 1px solid #c5ccd6;
    background: #f1f3f6;
    color: #555;
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
    border-color: var(--xp-btn-hover-border);
    background: var(--xp-btn-hover-face);
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
