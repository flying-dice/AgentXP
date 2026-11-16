<script lang="ts">
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import Composer from './Composer.svelte'
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
  }

  let {
    store,
    session,
    folder,
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
    dense = false
  }: Props = $props()

  const agentName = $derived(agent?.name ?? 'Agent')
  const info = $derived(store.state.session)
  const title = $derived(info.title || session.title)
  const modes = $derived(info.modes.length > 0 ? info.modes : session.modes)
  const modeId = $derived(info.currentModeId ?? session.currentModeId)
  const request = $derived(store.pendingInterrupt)
  const permission = $derived(request ? permissionMetadata(request.metadata) : null)
  const waitingToolCallId = $derived(request?.toolCallId ?? null)
</script>

<section class="session-view" aria-label={title}>
  {#if !compact}<SessionHeader {title} path={folder?.path} />{/if}
  <Transcript
    messages={store.messages}
    agentState={store.state}
    activities={store.activities}
    sessionId={session.id}
    {agentName}
    folderName={folder?.name ?? ''}
    running={store.running}
    error={store.error}
    {waitingToolCallId}
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
  <Composer
    {agentName}
    {prefill}
    {onprefilled}
    {dense}
    running={store.running}
    {modes}
    {modeId}
    {openFilePath}
    onsend={(text, files) => void store.send(text, files)}
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
