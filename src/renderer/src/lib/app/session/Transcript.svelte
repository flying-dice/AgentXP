<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { Message } from '@ag-ui/core'
  import type { A2uiClientEvent } from '@shared/a2ui'
  import type { AguiSessionState } from '@shared/agui-state'
  import type { SurfaceActivity } from '../../agui/activities'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'
  import type { ChatProblem, ProblemActionId, SendState } from './chatProblem'
  import A2uiActivity from './A2uiActivity.svelte'
  import { lastReply } from '../../apps/surface/lastReply'
  import SurfaceRow from './SurfaceRow.svelte'
  import { noSurfaceControls, surfaceRowModel, type SurfaceControls } from './surfaceRow'
  import AgentMessage from './AgentMessage.svelte'
  import ErrorRow from './ErrorRow.svelte'
  import StopNotice from './StopNotice.svelte'
  import ReasoningBlock from './ReasoningBlock.svelte'
  import ToolCallItem from './ToolCallItem.svelte'
  import VirtualList from '../../kit/organisms/VirtualList.svelte'
  import UserMessage from './UserMessage.svelte'
  import ActivityGroup from './ActivityGroup.svelte'
  import { transcriptDetail } from './transcriptDetail.svelte'
  import { browserWork } from './browserSteps'
  import { earlierStepRowIds, toolLabel } from './toolSummary'
  import { activityStats, activitySummary, buildTranscriptRows, groupTranscript, type TranscriptRow, type WorkRow } from './transcriptRows'

  interface Props {
    messages: readonly Message[]
    agentState: AguiSessionState
    activities: ReadonlyMap<string, SurfaceActivity>
    sessionId: number
    agentName: string
    folderName: string
    running?: boolean
    /** What went wrong, in plain words with its buttons (see `describeProblem`); null when all is well. */
    problem?: ChatProblem | null
    onproblem?: (id: ProblemActionId) => void
    /** The technical text under "Details..." while it is open (null: closed). */
    problemDetails?: string | null
    /** A restart of the agent: `working` shows "Restarting the agent..." with progress, `done` "The agent is running again.". */
    restart?: 'working' | 'done' | null
    /** The send state of a user message by message id (`not-sent`, `stopped`); a message not in it was sent. */
    sendStates?: ReadonlyMap<string, SendState>
    /** "Send again" and "Edit" of a message that was not sent. */
    onresend?: () => void
    onedit?: () => void
    /** The user pressed Stop and the reply ended: the notice "You stopped this reply" shows at the end. */
    stopped?: boolean
    /** Tool calls whose permission request the user denied. */
    deniedToolCalls?: ReadonlySet<string>
    /** The tool call a permission request is open for. */
    waitingToolCallId?: string | null
    onaction?: (event: A2uiClientEvent) => void
    /** What the surface rows can do (open, close, delete, move); the Chat app provides it. */
    surfaceControls?: SurfaceControls
    onlink?: (href: string) => void
    /** "Show in Event Viewer" under a failed step; gets the id of the tool call. */
    onshowtoolevent?: (toolCallId: string) => void
  }

  let {
    messages,
    agentState,
    activities,
    sessionId,
    agentName,
    folderName,
    running = false,
    problem = null,
    onproblem,
    problemDetails = null,
    restart = null,
    sendStates = new Map(),
    onresend,
    onedit,
    stopped = false,
    waitingToolCallId = null,
    deniedToolCalls = new Set(),
    onaction,
    surfaceControls = noSurfaceControls,
    onlink,
    onshowtoolevent
  }: Props = $props()

  const rows = $derived(buildTranscriptRows(messages, activities))
  /** What the agent said last: an inline form quotes it after Send. */
  const latestReply = $derived(lastReply(messages))
  const items = $derived(groupTranscript(rows))
  const rowDenied = (rowId: string): boolean => {
    const row = rows.find((r) => r.id === rowId)
    return row?.kind === 'tool' && deniedToolCalls.has(row.toolCallId)
  }
  // The cards right before a denied request keep their own caption "Earlier step" (also inside a Thinking line).
  const earlier = $derived(earlierStepRowIds(rows, rowDenied))

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
    return browserWork(rows)?.summary ?? activitySummary(activityStats(rows, failed))
  }
  /** The first and last step of a finished group that only used the Browser, in plain words. */
  function detailOf(id: string, rows: readonly WorkRow[]): string | null {
    return running && id === lastId ? null : (browserWork(rows)?.detail ?? null)
  }

  let scroller: HTMLDivElement | undefined = $state()
  let pinned = true
  /** Content grew while the user had scrolled up: the pill above the message box offers the way to the end. */
  let unseen = $state(false)

  let lastTop = 0
  const onScroll = (): void => {
    if (!scroller) return
    // Content that grew under a position we set ourselves is not the user leaving the end: only scrolling up unpins.
    const up = scroller.scrollTop < lastTop - 1
    lastTop = scroller.scrollTop
    if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 24) pinned = true
    else if (up) pinned = false
    if (pinned) unseen = false
  }

  const toEnd = (): void => {
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
    pinned = true
    unseen = false
  }

  // Follow new content while the user is at the bottom, and say so when they are not. Streaming text grows without
  // changing `rows` identity, so the observer below covers growth as well.
  $effect(() => {
    if (!scroller) return
    const content = scroller.firstElementChild
    if (!content) return
    const follow = (): void => {
      if (pinned) toEnd()
      else unseen = true
    }
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    toEnd()
    return () => observer.disconnect()
  })

  // The end of the conversation comes into view after a send (always: it is the user's own action), a finished turn and
  // a restart (unless the user scrolled up to read something).
  let seenCount = untrack(() => messages.length)
  $effect(() => {
    const count = messages.length
    const sent = messages.at(-1)?.role === 'user'
    untrack(() => {
      if (count > seenCount && sent) toEnd()
      seenCount = count
    })
  })
  let wasRunning = untrack(() => running)
  let hadProblem = untrack(() => !!problem)
  $effect(() => {
    const idle = !running
    const fine = !problem
    untrack(() => {
      const finished = wasRunning && idle
      const restarted = hadProblem && fine
      wasRunning = !idle
      hadProblem = !fine
      if (finished || restarted) void tick().then(() => pinned && toEnd())
    })
  })

  /** An inline form that appears is scrolled fully into view, also for a user who had scrolled up. */
  // Once per form: a row that scrolls out of the window and back is mounted again and must not pull the view to it.
  const revealed = new Set<string>()
  function reveal(node: HTMLElement, id: string): void {
    if (revealed.has(id)) return
    revealed.add(id)
    void Promise.resolve().then(() => {
      node.scrollIntoView({ block: 'nearest' })
      unseen = false
    })
  }
</script>

{#snippet rowView(row: TranscriptRow)}
  {#if row.kind === 'user'}
    <UserMessage text={row.text} attachments={row.attachments} state={sendStates.get(row.id) ?? 'sent'} {onresend} {onedit} />
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
      denied={deniedToolCalls.has(row.toolCallId)}
      earlier={earlier.has(row.id)}
      onshowevent={onshowtoolevent}
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
      {#if surface.target === 'inline'}<div use:reveal={row.surfaceId}><A2uiActivity messages={surface.messages} {sessionId} {onaction} {running} reply={latestReply} /></div>{/if}
    {/if}
  {/if}
{/snippet}

<div class="wrap">
<VirtualList
  class="transcript w7-scroll"
  data-testid="chat-transcript"
  data-running={running}
  bind:scroller
  onscroll={onScroll}
  role="log"
  aria-label="Conversation"
  aria-live="polite"
  {items}
  itemKey={(item) => (item.kind === 'row' ? item.row.id : item.id)}
>
  {#snippet row(item)}
    {#if item.kind === 'activity'}
      <div class="row">
        <ActivityGroup
          summary={summaryOf(item.id, item.rows)}
          detail={detailOf(item.id, item.rows)}
          live={running && item.id === lastId}
          bind:open={() => isOpen(item.id, item.rows), (value) => (overrides[item.id] = value)}
        >
          {#each item.rows as r (r.id)}
            {@render rowView(r)}
          {/each}
        </ActivityGroup>
      </div>
    {:else}
      <div class="row">
        {@render rowView(item.row)}
      </div>
    {/if}
  {/snippet}
  {#snippet empty()}
    <div class="row">
      {#if !problem}<AgentMessage testid="chat-welcome" {agentName} text="Ready in {folderName}. What would you like to work on?" />{/if}
    </div>
  {/snippet}
  {#snippet tail()}
    {#if stopped && !running && !problem}
      <div class="row"><StopNotice reason="cancelled" /></div>
    {/if}
    {#if problem}
      <div class="row"><ErrorRow message={problem.text} actions={problem.actions} onaction={onproblem} details={problemDetails} /></div>
    {/if}
    {#if restart === 'working' || (restart === 'done' && !problem)}
      <div class="row restart" role="status" data-testid="chat-restart-status" data-state={restart}>
        {#if restart === 'working'}
          <span>Restarting the agent...</span>
          <ProgressBar style="Marquee" width={160} label="Restarting the agent" />
        {:else}
          <span>The agent is running again.</span>
        {/if}
      </div>
    {/if}
    {#if running}
      <div class="busy">
        <span>{agentName} is working…</span>
        <ProgressBar style="Marquee" width={160} label="{agentName} is working" />
      </div>
    {/if}
  {/snippet}
</VirtualList>
  {#if unseen}
    <button type="button" class="more" data-testid="chat-new-messages" onclick={toEnd}>Newer messages below. Click to see them.</button>
  {/if}
</div>

<style>
  .wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* In the flow under the transcript, so it sits above the message box and never covers a message. */
  .more {
    flex: none;
    align-self: center;
    margin: 4px 0 0;
    padding: 2px 12px;
    border: 1px solid #7a9cc9;
    border-radius: 3px;
    background: linear-gradient(#fdfeff, #dbe8f8);
    font: inherit;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  }
  .restart {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #333;
  }
  .more:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .wrap :global(.transcript) {
    flex: 1;
    min-height: 0;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
    user-select: text;
    cursor: text;
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
