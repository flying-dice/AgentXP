<script lang="ts">
  import AnalogClock from '../kit/atoms/AnalogClock.svelte'
  import Gauge from '../kit/atoms/Gauge.svelte'
  import InfoPanel from '../kit/molecules/InfoPanel.svelte'
  import ToolStatusIcon from '../app/session/ToolStatusIcon.svelte'
  import { toolStatusView } from '../app/session/toolStatus'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import { ContextMenu } from '../apps/shared/ContextMenu.svelte'
  import type { AgentIdentity } from '@shared/identity'
  import { NOT_SAVED_NOTE, WAITING_FOR_YOU, feedAction, feedLabel, type FeedItem } from './activity'
  import { lastFinished, lastProblem, LEVEL_LABEL } from '../apps/event-viewer/eventModel'
  import type { ProtocolEventDto } from '@shared/desktop'
  import type { AgentXPApi } from '@shared/ipc'

  interface Props {
    chatTitle: string | null
    contextUsed: number
    contextSize: number
    feed: FeedItem[]
    /** `controlNote` of the feed: "You are in control. The agent asks first." while the user is in control; null otherwise. */
    controlNote?: string | null
    /** Session start for the running-time line; defaults to when the infopanels appeared. */
    since?: Date
    now?: Date
    /** A click on a line of the list: its **Show in...** place (Code, Terminal, Browser), else the chat that did it. */
    onshowfeeditem?: (item: FeedItem) => void
    /** The agent of a feed line (`agentIdentity`): its colour swatch and name lead the line (never the colour alone). */
    identityOf?: (sessionId: number) => AgentIdentity
    /** Opens the Event Viewer: the link under the Activity list, a double-click on the infopanel and its right-click menu. */
    onopeneventviewer?: () => void
    /** The link of the "This is not saved" sentence (UX-173): opens Control Center at Permissions. */
    onopenpermissions?: () => void
    /** Where the last warning or error comes from (UX-171); without it the infopanel shows the tool calls only. */
    api?: Pick<AgentXPApi, 'events' | 'on'>
    desktopId?: number
    /** What the desktop's chats are doing now ("start the long job", `workingText` of the bar); null when idle. */
    working?: string | null
  }

  let { chatTitle, contextUsed, contextSize, feed, onshowfeeditem, identityOf, controlNote = null, since = new Date(), now: fixedNow, onopeneventviewer, onopenpermissions, api, desktopId, working = null }: Props = $props()

  const menu = new ContextMenu()
  const menuItems = () => [{ id: 'infopanel-activity-menu-event-viewer', testid: 'infopanel-activity-menu-event-viewer', label: '&Event Viewer', icon: 'eventlog' as const, action: () => onopeneventviewer?.() }]

  // The newest warning or error, so "Drive E: was removed" shows here and not only in the Event Viewer.
  let events = $state.raw<ProtocolEventDto[]>([])
  const problem = $derived(lastProblem(events))
  /** The last thing that finished, for a feed with no step: "Nothing has happened yet." is only for a log with no event at all (UX-212). */
  /** The bar's words: "Working: <what>", or "Waiting for you: ..." as it is. */
  const workingLine = $derived(working ? (working.startsWith(WAITING_FOR_YOU) ? working : `Working: ${working}`) : null)
  const finished = $derived(lastFinished(events))
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

<aside class="infopanels" aria-label="InfoPanels">
  <InfoPanel title="Context meter">
    <div class="meter">
      <Gauge value={ratio} label="Context used" />
      <div class="read">
        <div class="big">{Math.round(ratio * 100)}%</div>
        <div class="muted">{contextSize > 0 ? `${k(contextUsed)} of ${k(contextSize)} tokens` : chatTitle ? 'Nothing sent yet' : 'No chat yet'}</div>
        {#if chatTitle}<div class="muted name" title={chatTitle}>{chatTitle}</div>{/if}
      </div>
    </div>
  </InfoPanel>
  <InfoPanel title="Desktop clock">
    <div class="meter">
      <AnalogClock time={now} />
      <div class="read">
        <div class="big">{pad(now.getHours())}:{pad(now.getMinutes())}</div>
        <div class="muted">{running} running time</div>
      </div>
    </div>
  </InfoPanel>
  <InfoPanel title="Activity">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="activity" role="group" aria-label="Activity" data-testid="infopanel-activity" title={onopeneventviewer ? 'Double-click to open the Event Viewer.' : undefined} ondblclick={() => onopeneventviewer?.()} oncontextmenu={(e) => onopeneventviewer && menu.show(e, menuItems())}>
    <ul class="feed">
      {#if controlNote}<li class="control" data-testid="infopanel-activity-control">{controlNote}</li>
        <li class="not-saved" data-testid="infopanel-activity-not-saved"><span>{NOT_SAVED_NOTE.before}{#if onopenpermissions}<button type="button" class="open-events inline" data-testid="infopanel-activity-open-permissions" onclick={() => onopenpermissions?.()}>{NOT_SAVED_NOTE.link}</button>{:else}{NOT_SAVED_NOTE.link}{/if}{NOT_SAVED_NOTE.after}</span></li>{/if}
      {#if problem}<li class="problem" data-testid="infopanel-activity-problem" data-level={problem.level} title="{LEVEL_LABEL[problem.level]}: {problem.text}"><span class="t">{LEVEL_LABEL[problem.level]}: {problem.text}</span></li>{/if}
      {#if workingLine}<li class="working" data-testid="infopanel-activity-working"><span class="t" title={workingLine}>{workingLine}</span></li>{/if}
      {#each feed as item (item.key)}
        {@const who = identityOf?.(item.sessionId) ?? null}
        <li><ToolStatusIcon kind={toolStatusView(item.status).kind} label={toolStatusView(item.status).label} />{#if onshowfeeditem}<button type="button" class="t item" data-testid="infopanel-activity-item" data-action={feedAction(item)} data-session-id={item.sessionId} data-agent={who?.name} title="{who ? `${who.name}, ` : ''}{item.chatTitle}: {feedLabel(item)}. Click: {feedAction(item)}." onclick={() => onshowfeeditem?.(item)}>{@render agent(who)}{feedLabel(item)}</button>{:else}<span class="t" title="{item.chatTitle}: {feedLabel(item)}">{@render agent(who)}{feedLabel(item)}</span>{/if}</li>
      {:else}
        {#if !problem && !working}<li class="muted" data-testid="infopanel-activity-last">{finished ?? 'Nothing has happened yet.'}</li>{/if}
      {/each}
    </ul>
    {#if onopeneventviewer}<button type="button" class="open-events" data-testid="infopanel-activity-open-event-viewer" onclick={() => onopeneventviewer?.()}>Event Viewer</button>{/if}
    </div>
  </InfoPanel>
</aside>
<ContextMenuStrip bind:open={menu.open} x={menu.x} y={menu.y} items={menu.items} label="Activity" />

{#snippet agent(who: AgentIdentity | null)}{#if who}<span class="who" data-testid="infopanel-activity-agent"><span class="swatch" style:background={who.color} aria-hidden="true"></span><b>{who.name}</b>:{' '}</span>{/if}{/snippet}

<style>
  .infopanels {
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
    color: var(--xp-infopanel-muted);
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
  .feed li.problem .t {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  .feed li.working {
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
    color: var(--xp-infopanel-text);
    text-decoration: underline;
    cursor: default;
  }
  .open-events.inline {
    margin: 0;
  }
  .open-events:focus-visible {
    outline: var(--xp-focus-outline);
  }
  /* A line of the list is a link to where its step can be seen (Show in Code, Terminal, Browser, or the chat). */
  .item {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .item:hover {
    text-decoration: underline;
  }
  .item:focus-visible {
    outline: var(--xp-focus-outline);
  }
  .swatch {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin: 0 3px 0 0;
    border: 1px solid rgba(0, 0, 0, 0.45);
    vertical-align: 0;
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
