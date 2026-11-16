<script lang="ts">
  import { effectiveStatus, isStarting } from '../sessionStatus'
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import Composer from './Composer.svelte'
  import { describeProblem, sendStateOf, type ProblemActionId, type SendState } from './chatProblem'
  import PermissionDialog from './PermissionDialog.svelte'
  import { permissionMetadata } from './permissionOptions'
  import SessionHeader from './SessionHeader.svelte'
  import type { SessionStoreLike } from './SessionStoreLike'
  import type { SurfaceControls } from './surfaceRow'
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
    suggestions?: readonly { id: string; label: string; text: string }[]
    /** See `Composer`: fills and focuses the box. */
    prefill?: { id: number; text?: string } | null
    onprefilled?: (id: number) => void
    /** A short composer (the chat pane). */
    dense?: boolean
    /** The desktop is paused: a banner above the message box says so. */
    paused?: boolean
    /** The desktop's "Ask before every action" state, shown (and switched) in the Mode menu. */
    askFirst?: boolean
    onaskfirst?: (on: boolean) => void
    /** "Details..." of the error row: the technical text, for the host to show with the log. */
    ondetails?: (detail: string | null) => void
    /** "Show in Event Viewer" of the error row. */
    onshowevents?: () => void
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
    askFirst = false,
    onaskfirst,
    ondetails,
    onshowevents
  }: Props = $props()

  const agentName = $derived(agent?.name ?? 'Agent')
  const info = $derived(store.state.session)
  const title = $derived(info.title || session.title)
  const modes = $derived(info.modes.length > 0 ? info.modes : session.modes)
  const modeId = $derived(info.currentModeId ?? session.currentModeId)
  const request = $derived(store.pendingInterrupt)
  const permission = $derived(request ? permissionMetadata(request.metadata) : null)
  const waitingToolCallId = $derived(request?.toolCallId ?? null)
  const starting = $derived(isStarting(effectiveStatus(info.status, session.status)))

  // ---- what went wrong: the error row, the state of the failed message -------------------------------------
  const problem = $derived(describeProblem({ error: store.error, problem: session.problem, failed: store.failedSend }))
  const sendStates = $derived.by((): ReadonlyMap<string, SendState> => {
    const failed = store.failedSend
    return failed ? new Map([[failed.messageId, sendStateOf(failed.messageId, failed, !!session.problem)]]) : new Map()
  })

  function onproblem(id: ProblemActionId): void {
    if (id === 'send-again') void store.resend({ restart: !!session.problem })
    else if (id === 'restart-send') void store.resend({ restart: true })
    else if (id === 'restart') void store.reconnect()
    else if (id === 'details') ondetails?.(problem?.detail ?? null)
    else onshowevents?.()
  }

  /** "Edit" on a message that was not sent: the text goes back into the message box. */
  let edit = $state<{ id: number; text: string } | null>(null)
  let editSeq = 0
  async function editFailed(): Promise<void> {
    const failed = await store.takeBack()
    if (failed) edit = { id: --editSeq, text: failed.text }
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
    {sendStates}
    onresend={() => onproblem('send-again')}
    onedit={() => void editFailed()}
    stopped={store.stoppedByUser}
    {waitingToolCallId}
    deniedToolCalls={store.deniedToolCalls}
    onaction={(event) => void store.sendA2uiAction(event)}
    {surfaceControls}
  />
  {#if suggestions.length > 0 && !store.running && !request}
    <div class="chips" data-testid="embedded-chat-suggestions" role="group" aria-label="Suggestions">
      {#each suggestions as s (s.id)}
        <button type="button" class="chip" data-testid="embedded-chat-suggestion" data-suggestion={s.id} onclick={() => void store.send(s.text)}>{s.label}</button>
      {/each}
    </div>
  {/if}
  {#if paused}
    <div class="paused" role="status" data-testid="chat-paused-banner">This desktop is paused. Click Resume agents on the bar.</div>
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
    padding: 1px 8px;
    border: 1px solid #9aa9bf;
    border-radius: 9px;
    background: linear-gradient(#fdfeff, #e6eef8);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
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
  .session-view {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
</style>
