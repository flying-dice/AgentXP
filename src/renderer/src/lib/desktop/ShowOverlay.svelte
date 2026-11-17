<script lang="ts">
  /**
   * The agent cursor layer of the desktop (`docs/AGENT_PRESENCE.md`, sections 5 and 8): fixed over everything but the
   * UAC prompt (z-index 160000, above the popup layer), click-through. One cursor per agent that is pointing. A show
   * (`desktop.show`) glides the agent's cursor from where it was (else from its chat) to the spot and then shows the note
   * callout beside it; a Browser action (`desktop.agentCursor`) only moves the cursor. The cursor fades after a short
   * idle. Any operator click or key (outside the callout) stops a glide and dismisses the show; Pause hides it all.
   */
  import { onDestroy, untrack } from 'svelte'
  import type { AgentIdentity } from '@shared/identity'
  import { CURSOR_IDLE_MS, GLIDE_MS, type ShowSpot } from '@shared/show'
  import AgentCursor, { type AgentCursorState } from '../kit/organisms/AgentCursor.svelte'
  import ShowCallout from './ShowCallout.svelte'
  import type { DesktopController } from './DesktopController.svelte'
  import { chatRect, cursorPoint, glideStart, placeCallout, resolveSpot, type Rect } from './showResolvers'

  let { desktop }: { desktop: DesktopController } = $props()

  interface CursorView {
    sessionId: number
    identity: AgentIdentity
    x: number
    y: number
    state: AgentCursorState
  }

  /** How long a spot may take to appear on screen (a window opening, a file loading) before the cursor gives up. */
  const RESOLVE_MS = 3000

  let cursors = $state<Record<number, CursorView>>({})
  /** The rectangle of the show's spot once the cursor arrived (the callout goes beside it). */
  let target = $state<Rect | null>(null)
  let calloutEl = $state<HTMLDivElement | null>(null)
  let calloutSize = $state({ width: 260, height: 110 })
  let innerWidth = $state(0)
  let innerHeight = $state(0)
  let reduced = $state(false)

  /** The current pointing of each agent: a newer one (or the operator) makes an older one stop. */
  const runs = new Map<number, number>()
  const timers = new Map<number, ReturnType<typeof setTimeout>[]>()
  let runSeq = 0
  let showRun = 0

  $effect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    reduced = query.matches
    const changed = (e: MediaQueryListEvent): void => void (reduced = e.matches)
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  })

  const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))
  const same = (a: Rect, b: Rect): boolean => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1

  /** The spot's rectangle once it is on screen and still (the window placed, the lines scrolled in); null when it never shows. */
  async function settledRect(spot: ShowSpot, alive: () => boolean): Promise<Rect | null> {
    const until = performance.now() + RESOLVE_MS
    let last: Rect | null = null
    let still = 0
    while (performance.now() < until && alive()) {
      const rect = resolveSpot(document, spot)
      if (rect && last && same(rect, last)) {
        if (++still >= 2) return rect
      } else still = 0
      last = rect
      await frame()
    }
    return alive() ? last : null
  }

  function setCursor(sessionId: number, patch: Partial<CursorView>): void {
    const current = cursors[sessionId]
    if (!current && patch.identity === undefined) return
    cursors = { ...cursors, [sessionId]: { ...(current as CursorView), ...patch } }
  }

  function clearTimers(sessionId: number): void {
    for (const t of timers.get(sessionId) ?? []) clearTimeout(t)
    timers.delete(sessionId)
  }

  const later = (sessionId: number, ms: number, run: () => void): void => {
    timers.set(sessionId, [...(timers.get(sessionId) ?? []), setTimeout(run, ms)])
  }

  /** Glides (or, with reduced motion, jumps) the agent's cursor to the spot; `arrived` gets the rectangle. */
  async function point(sessionId: number, identity: AgentIdentity, spot: ShowSpot, arrived?: (rect: Rect) => void): Promise<void> {
    const token = ++runSeq
    runs.set(sessionId, token)
    clearTimers(sessionId)
    const alive = (): boolean => runs.get(sessionId) === token && !desktop.state.paused
    const rect = await settledRect(spot, alive)
    if (!rect || !alive()) return
    const tip = cursorPoint(rect)
    const before = cursors[sessionId]
    const from = glideStart(before && before.state !== 'hidden' ? { x: before.x, y: before.y } : null, chatRect(document, sessionId, desktop.state.windows), tip)
    if (reduced) {
      setCursor(sessionId, { sessionId, identity, x: tip.x, y: tip.y, state: 'arrived' })
    } else {
      setCursor(sessionId, { sessionId, identity, x: from.x, y: from.y, state: 'ready' })
      await frame()
      await frame()
      if (!alive()) return
      setCursor(sessionId, { x: tip.x, y: tip.y, state: 'gliding' })
      await new Promise<void>((resolve) => later(sessionId, GLIDE_MS, resolve))
      if (!alive()) return
      setCursor(sessionId, { state: 'arrived' })
    }
    arrived?.(rect)
    later(sessionId, CURSOR_IDLE_MS, () => {
      if (runs.get(sessionId) === token) setCursor(sessionId, { state: 'idle' })
    })
  }

  // A show: the cursor first (unless the operator asked: Show again), then the note beside the spot.
  let shownId: string | null = null
  $effect(() => {
    const show = desktop.currentShow
    untrack(() => {
      if (!show) {
        shownId = null
        target = null
        return
      }
      if (show.showId === shownId) return
      shownId = show.showId
      target = null
      const run = ++showRun
      const current = (): boolean => run === showRun && desktop.currentShow?.showId === show.showId
      const land = (rect: Rect): void => {
        if (current()) target = rect
      }
      if (show.cursor) void point(show.sessionId, show.identity, show.spot, land)
      else void settledRect(show.spot, current).then((rect) => rect && land(rect))
    })
  })

  // A Browser action: the cursor goes to the element before the click.
  $effect(() => {
    const ping = desktop.cursorPing
    untrack(() => {
      if (ping) void point(ping.sessionId, ping.identity, ping.spot)
    })
  })

  // Pause stops all motion: no cursors, no callout.
  $effect(() => {
    if (!desktop.state.paused) return
    untrack(() => {
      for (const id of timers.keys()) clearTimers(id)
      runs.clear()
      cursors = {}
      target = null
    })
  })

  // The callout is placed by its real size.
  $effect(() => {
    const el = calloutEl
    if (!el || !target) return
    const width = el.offsetWidth
    const height = el.offsetHeight
    if (width !== calloutSize.width || height !== calloutSize.height) untrack(() => (calloutSize = { width, height }))
  })

  const area = $derived.by((): Rect => {
    const bar = typeof document === 'undefined' ? null : document.querySelector('.xp-taskbar')?.getBoundingClientRect()
    const height = bar && bar.top > 0 ? bar.top : innerHeight
    return { x: 0, y: 0, width: innerWidth, height }
  })
  const placement = $derived(target ? placeCallout(target, calloutSize, area) : null)

  /** The operator always wins: a click or a key anywhere but the callout stops a glide and ends the show. */
  function onOperatorInput(event: Event): void {
    if (calloutEl && event.target instanceof Node && calloutEl.contains(event.target)) return
    for (const c of Object.values(cursors)) {
      if (c.state === 'gliding' || c.state === 'ready') {
        runs.delete(c.sessionId)
        clearTimers(c.sessionId)
        setCursor(c.sessionId, { state: 'cancelled' })
      } else if (c.state === 'arrived' && desktop.currentShow?.sessionId === c.sessionId) {
        setCursor(c.sessionId, { state: 'idle' })
      }
    }
    if (desktop.currentShow) desktop.dismissShow()
  }

  onDestroy(() => {
    for (const id of timers.keys()) clearTimers(id)
  })
</script>

<svelte:window bind:innerWidth bind:innerHeight onpointerdowncapture={onOperatorInput} onkeydowncapture={onOperatorInput} />

<div class="layer">
  {#each Object.values(cursors) as c (c.sessionId)}
    <AgentCursor name={c.identity.name} color={c.identity.color} x={c.x} y={c.y} state={c.state} reducedMotion={reduced} glideMs={GLIDE_MS} />
  {/each}
  {#if desktop.currentShow && placement}
    {@const show = desktop.currentShow}
    <ShowCallout
      name={show.identity.name}
      color={show.identity.color}
      label={show.label}
      note={show.note}
      showId={show.showId}
      {placement}
      bind:element={calloutEl}
      onok={() => desktop.dismissShow()}
      onreply={() => void desktop.replyToShow()}
    />
  {/if}
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 160000;
    pointer-events: none;
    overflow: hidden;
  }
</style>
