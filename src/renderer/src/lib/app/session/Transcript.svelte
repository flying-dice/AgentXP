<script lang="ts">
  import type { Message } from '@ag-ui/core'
  import type { A2uiClientEvent } from '@shared/a2ui'
  import type { AguiSessionState } from '@shared/agui-state'
  import type { SurfaceActivity } from '../../agui/activities'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import A2uiActivity from './A2uiActivity.svelte'
  import SurfaceRow from './SurfaceRow.svelte'
  import { noSurfaceControls, surfaceRowModel, type SurfaceControls } from './surfaceRow'
  import AgentMessage from './AgentMessage.svelte'
  import ErrorRow from './ErrorRow.svelte'
  import StopNotice from './StopNotice.svelte'
  import ReasoningBlock from './ReasoningBlock.svelte'
  import ToolCallItem from './ToolCallItem.svelte'
  import UserMessage from './UserMessage.svelte'
  import ActivityGroup from './ActivityGroup.svelte'
  import { transcriptDetail } from './transcriptDetail.svelte'
  import { toolLabel } from './toolSummary'
  import { activityStats, activitySummary, buildTranscriptRows, groupTranscript, type TranscriptRow, type WorkRow } from './transcriptRows'

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
    /** What the surface rows can do (open, close, delete, move); the Chat app provides it. */
    surfaceControls?: SurfaceControls
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
    surfaceControls = noSurfaceControls,
    onlink
  }: Props = $props()

  const items = $derived(groupTranscript(buildTranscriptRows(messages, activities)))

  // Groups the user opened or closed by hand; otherwise a group is closed, unless a permission request is open inside it
  // or the user chose to show all details.
  let overrides = $state<Record<string, boolean>>({})
  const failed = (toolCallId: string): boolean => agentState.toolCalls[toolCallId]?.status === 'failed'
  const hasWaiting = (rows: readonly WorkRow[]): boolean => rows.some((r) => r.kind === 'tool' && r.toolCallId === waitingToolCallId)
  const isOpen = (id: string, rows: readonly WorkRow[]): boolean => overrides[id] ?? (transcriptDetail.showAll || hasWaiting(rows))

  /** The last group of a turn that is still running shows what the agent is doing now. */
  const lastId = $derived.by(() => {
    const last = items.at(-1)
    return last?.kind === 'activity' ? last.id : null
  })
  function summaryOf(id: string, rows: readonly WorkRow[]): string {
    if (running && id === lastId) {
      const current = rows.findLast((r) => r.kind === 'tool')
      if (current?.kind === 'tool') {
        const call = agentState.toolCalls[current.toolCallId]
        return `Working… ${toolLabel(call?.kind, current.name, call?.rawInput ?? current.rawInput)}`
      }
      return 'Thinking…'
    }
    return activitySummary(activityStats(rows, failed))
  }

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

{#snippet rowView(row: TranscriptRow)}
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
  {:else if row.kind === 'stop'}
    <StopNotice reason={row.reason} />
  {:else}
    {@const surface = activities.get(row.surfaceId)}
    {#if surface}
      <SurfaceRow
        model={surfaceRowModel(surface, surfaceControls.windowOpen(surface))}
        onopen={() => surfaceControls.open(surface)}
        onclose={() => surfaceControls.close(surface)}
        ondelete={() => surfaceControls.remove(surface)}
        onmove={(target) => surfaceControls.move(surface, target)}
      />
      {#if surface.target === 'inline'}<A2uiActivity messages={surface.messages} {sessionId} {onaction} />{/if}
    {/if}
  {/if}
{/snippet}

<div class="transcript w7-scroll" data-testid="chat-transcript" data-running={running} bind:this={scroller} onscroll={onScroll} role="log" aria-label="Conversation" aria-live="polite">
  <div class="rows">
    {#each items as item (item.kind === 'row' ? item.row.id : item.id)}
      {#if item.kind === 'activity'}
        <div class="row">
          <ActivityGroup
            summary={summaryOf(item.id, item.rows)}
            live={running && item.id === lastId}
            bind:open={() => isOpen(item.id, item.rows), (value) => (overrides[item.id] = value)}
          >
            {#each item.rows as row (row.id)}
              {@render rowView(row)}
            {/each}
          </ActivityGroup>
        </div>
      {:else}
        <div class="row">
          {@render rowView(item.row)}
        </div>
      {/if}
    {:else}
      <div class="row">
        <AgentMessage testid="chat-welcome" {agentName} text="Ready in {folderName}. What would you like to work on?" />
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
