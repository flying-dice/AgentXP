<script lang="ts">
  import AnalogClock from '../kit/atoms/AnalogClock.svelte'
  import Gauge from '../kit/atoms/Gauge.svelte'
  import Gadget from '../kit/molecules/Gadget.svelte'
  import ToolStatusIcon from '../app/session/ToolStatusIcon.svelte'
  import { toolStatusView } from '../app/session/toolStatus'
  import { toolTitleOr } from '../app/session/toolTitles'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import { ContextMenu } from '../apps/shared/ContextMenu.svelte'
  import { NOT_SAVED_NOTE, feedText, type FeedItem } from './activity'
  import { lastProblem, LEVEL_LABEL } from '../apps/event-viewer/eventModel'
  import type { ProtocolEventDto } from '@shared/desktop'
  import type { Agent7Api } from '@shared/ipc'

  interface Props {
    chatTitle: string | null
    contextUsed: number
    contextSize: number
    feed: FeedItem[]
    /** `controlNote` of the feed: "You are in control. The agent asks first." while the user is in control; null otherwise. */
    controlNote?: string | null
    /** Session start for the running-time line; defaults to when the gadgets appeared. */
    since?: Date
    now?: Date
    /** Opens the Event Viewer: the link under the Activity list, a double-click on the gadget and its right-click menu. */
    onopeneventviewer?: () => void
    /** The link of the "This is not saved" sentence (UX-173): opens Control Center at Permissions. */
    onopenpermissions?: () => void
    /** Where the last warning or error comes from (UX-171); without it the gadget shows the tool calls only. */
    api?: Pick<Agent7Api, 'events' | 'on'>
    desktopId?: number
  }

  let { chatTitle, contextUsed, contextSize, feed, controlNote = null, since = new Date(), now: fixedNow, onopeneventviewer, onopenpermissions, api, desktopId }: Props = $props()

  const menu = new ContextMenu()
  const menuItems = () => [{ id: 'gadget-activity-menu-event-viewer', testid: 'gadget-activity-menu-event-viewer', label: '&Event Viewer', icon: 'eventlog' as const, action: () => onopeneventviewer?.() }]

  // The newest warning or error, so "Drive E: was removed" shows here and not only in the Event Viewer.
  let events = $state.raw<ProtocolEventDto[]>([])
  const problem = $derived(lastProblem(events))
  $effect(() => {
    if (!api || !desktopId) return
    let live = true
    void api.events.query({ desktopId, limit: 200 }).then((list) => live && (events = list)).catch(() => {})
    const stop = api.on('events.appended', (added) => {
      const mine = added.filter((e) => e.desktopId === desktopId)
      if (mine.length) events = [...events, ...mine].slice(-200)
    })
    return () => {
      live = false
      stop()
    }
  })

  let tick = $state(new Date())
  $effect(() => {
    if (fixedNow) return
    const id = setInterval(() => (tick = new Date()), 10_000)
    return () => clearInterval(id)
  })
  const now = $derived(fixedNow ?? tick)

  const ratio = $derived(contextSize > 0 ? Math.min(1, contextUsed / contextSize) : 0)
  const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
  const pad = (n: number): string => String(n).padStart(2, '0')
  const running = $derived.by(() => {
    const minutes = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60000))
    return `${Math.floor(minutes / 60)}:${pad(minutes % 60)} h`
  })
</script>

<aside class="gadgets" aria-label="Gadgets">
  <Gadget title="Context meter">
    <div class="meter">
      <Gauge value={ratio} label="Context used" />
      <div class="read">
        <div class="big">{Math.round(ratio * 100)}%</div>
        <div class="muted">{contextSize > 0 ? `${k(contextUsed)} of ${k(contextSize)} tokens` : chatTitle ? 'Nothing sent yet' : 'No chat yet'}</div>
        {#if chatTitle}<div class="muted name" title={chatTitle}>{chatTitle}</div>{/if}
      </div>
    </div>
  </Gadget>
  <Gadget title="Desktop clock">
    <div class="meter">
      <AnalogClock time={now} />
      <div class="read">
        <div class="big">{pad(now.getHours())}:{pad(now.getMinutes())}</div>
        <div class="muted">{running} running time</div>
      </div>
    </div>
  </Gadget>
  <Gadget title="Activity">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="activity" role="group" aria-label="Activity" data-testid="gadget-activity" title={onopeneventviewer ? 'Double-click to open the Event Viewer.' : undefined} ondblclick={() => onopeneventviewer?.()} oncontextmenu={(e) => onopeneventviewer && menu.show(e, menuItems())}>
    <ul class="feed">
      {#if controlNote}<li class="control" data-testid="gadget-activity-control">{controlNote}</li>
        <li class="not-saved" data-testid="gadget-activity-not-saved"><span>{NOT_SAVED_NOTE.before}{#if onopenpermissions}<button type="button" class="open-events inline" data-testid="gadget-activity-open-permissions" onclick={() => onopenpermissions?.()}>{NOT_SAVED_NOTE.link}</button>{:else}{NOT_SAVED_NOTE.link}{/if}{NOT_SAVED_NOTE.after}</span></li>{/if}
      {#if problem}<li class="problem" data-testid="gadget-activity-problem" data-level={problem.level} title="{LEVEL_LABEL[problem.level]}: {problem.text}"><span class="t">{LEVEL_LABEL[problem.level]}: {problem.text}</span></li>{/if}
      {#each feed as item (item.key)}
        <li><ToolStatusIcon kind={toolStatusView(item.status).kind} label={toolStatusView(item.status).label} /><span class="t" title="{item.chatTitle}: {feedText(toolTitleOr(item.title), item.count)}">{feedText(toolTitleOr(item.title), item.count)}</span></li>
      {:else}
        {#if !problem}<li class="muted">Nothing has happened yet.</li>{/if}
      {/each}
    </ul>
    {#if onopeneventviewer}<button type="button" class="open-events" data-testid="gadget-activity-open-event-viewer" onclick={() => onopeneventviewer?.()}>Event Viewer</button>{/if}
    </div>
  </Gadget>
</aside>
<ContextMenuStrip bind:open={menu.open} x={menu.x} y={menu.y} items={menu.items} label="Activity" />

<style>
  .gadgets {
    position: absolute;
    top: 40px;
    right: 14px;
    width: 206px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 0;
    max-height: calc(100% - 50px);
    overflow: hidden;
  }
  .meter {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .read {
    min-width: 0;
  }
  .big {
    font-size: 20px;
    line-height: 1.1;
  }
  .muted {
    font-size: 11px;
    color: var(--w7-gadget-muted);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .feed {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .feed li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    line-height: 1.25;
  }
  .feed li.problem {
    font-weight: 700;
  }
  .feed li.control {
    font-weight: 700;
  }
  .open-events {
    margin: 6px 0 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 11px;
    color: var(--w7-gadget-text);
    text-decoration: underline;
    cursor: default;
  }
  .open-events.inline {
    margin: 0;
  }
  .open-events:focus-visible {
    outline: var(--w7-focus-outline);
  }
  .t {
    min-width: 0;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
