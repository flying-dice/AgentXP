<script lang="ts">
  import type { Message } from '@ag-ui/core'
  import type { A2uiClientEvent } from '@shared/a2ui'
  import type { AguiSessionState } from '@shared/agui-state'
  import type { SurfaceActivity } from '../../agui/activities'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import A2uiActivity from './A2uiActivity.svelte'
  import AgentMessage from './AgentMessage.svelte'
  import ErrorRow from './ErrorRow.svelte'
  import ReasoningBlock from './ReasoningBlock.svelte'
  import ToolCallItem from './ToolCallItem.svelte'
  import UserMessage from './UserMessage.svelte'
  import { buildTranscriptRows } from './transcriptRows'

  interface Props {
    messages: readonly Message[]
    agentState: AguiSessionState
    activities: ReadonlyMap<string, SurfaceActivity>
    sessionId: number
    agentName: string
    folderName: string
    running?: boolean
    error?: string | null
    /** The tool call a permission request is open for. */
    waitingToolCallId?: string | null
    onaction?: (event: A2uiClientEvent) => void
    onlink?: (href: string) => void
  }

  let {
    messages,
    agentState,
    activities,
    sessionId,
    agentName,
    folderName,
    running = false,
    error = null,
    waitingToolCallId = null,
    onaction,
    onlink
  }: Props = $props()

  const rows = $derived(buildTranscriptRows(messages, activities))

  let scroller: HTMLDivElement | undefined = $state()
  let pinned = true

  const onScroll = (): void => {
    if (scroller) pinned = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 24
  }

  // Follow new content while the user is at the bottom. Streaming text grows without changing `rows`
  // identity, so the observer below covers growth as well.
  $effect(() => {
    if (!scroller) return
    const content = scroller.firstElementChild
    if (!content) return
    const follow = (): void => {
      if (pinned && scroller) scroller.scrollTop = scroller.scrollHeight
    }
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    follow()
    return () => observer.disconnect()
  })
</script>

<div class="transcript w7-scroll" bind:this={scroller} onscroll={onScroll} role="log" aria-label="Conversation" aria-live="polite">
  <div class="rows">
    {#each rows as row (row.id)}
      <div class="row">
        {#if row.kind === 'user'}
          <UserMessage text={row.text} attachments={row.attachments} />
        {:else if row.kind === 'agent'}
          <AgentMessage {agentName} text={row.text} {onlink} />
        {:else if row.kind === 'reasoning'}
          <ReasoningBlock text={row.text} />
        {:else if row.kind === 'tool'}
          <ToolCallItem
            {row}
            toolCall={agentState.toolCalls[row.toolCallId]}
            terminals={agentState.terminals}
            waiting={waitingToolCallId === row.toolCallId}
          />
        {:else}
          {@const surface = activities.get(row.surfaceId)}
          {#if surface}<A2uiActivity messages={surface.messages} {sessionId} {onaction} />{/if}
        {/if}
      </div>
    {:else}
      <div class="row">
        <AgentMessage {agentName} text="Ready in {folderName}. What would you like to work on?" />
      </div>
    {/each}
    {#if error}
      <div class="row"><ErrorRow message={error} /></div>
    {/if}
    {#if running}
      <div class="busy">
        <span>{agentName} is working…</span>
        <ProgressBar style="Marquee" width={160} label="{agentName} is working" />
      </div>
    {/if}
  </div>
</div>

<style>
  .transcript {
    flex: 1;
    min-height: 0;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
    user-select: text;
    cursor: text;
  }
  .rows {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .row {
    padding: 7px 10px 8px;
    border-bottom: 1px solid #eef1f5;
  }
  .busy {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    color: #333;
  }
</style>
