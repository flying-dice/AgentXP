<script lang="ts">
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import Composer from './Composer.svelte'
  import PermissionDialog from './PermissionDialog.svelte'
  import { permissionMetadata } from './permissionOptions'
  import SessionHeader from './SessionHeader.svelte'
  import type { SessionStoreLike } from './SessionStoreLike'
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
  }

  let {
    store,
    session,
    folder,
    agent,
    openFilePath = null,
    setMode = (id, modeId) => window.agent7.sessions.setMode(id, modeId),
    pickFiles = () => window.agent7.dialogs.pickFiles(),
    contained = false
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
  <SessionHeader {title} path={folder?.path} />
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
  />
  <Composer
    {agentName}
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
  .session-view {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }
</style>
