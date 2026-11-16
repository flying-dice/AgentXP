<script lang="ts">
  import AnalogClock from '../kit/atoms/AnalogClock.svelte'
  import Gauge from '../kit/atoms/Gauge.svelte'
  import Gadget from '../kit/molecules/Gadget.svelte'
  import ToolStatusIcon from '../app/session/ToolStatusIcon.svelte'
  import { toolStatusView } from '../app/session/toolStatus'
  import { toolTitleOr } from '../app/session/toolTitles'
  import { feedText, type FeedItem } from './activity'

  interface Props {
    chatTitle: string | null
    contextUsed: number
    contextSize: number
    feed: FeedItem[]
    /** `controlNote` of the feed: "Stopped: you took control" or "You are in control..." while the user is in control; null otherwise. */
    controlNote?: string | null
    /** Session start for the running-time line; defaults to when the gadgets appeared. */
    since?: Date
    now?: Date
  }

  let { chatTitle, contextUsed, contextSize, feed, controlNote = null, since = new Date(), now: fixedNow }: Props = $props()

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
    <ul class="feed">
      {#if controlNote}<li class="control" data-testid="gadget-activity-control">{controlNote}</li>{/if}
      {#each feed as item (item.key)}
        <li><ToolStatusIcon kind={toolStatusView(item.status).kind} label={toolStatusView(item.status).label} /><span class="t" title="{item.chatTitle}: {feedText(toolTitleOr(item.title), item.count)}">{feedText(toolTitleOr(item.title), item.count)}</span></li>
      {:else}
        <li class="muted">Nothing has happened yet.</li>
      {/each}
    </ul>
  </Gadget>
</aside>

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
  .feed li.control {
    font-weight: 700;
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
