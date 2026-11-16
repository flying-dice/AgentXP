<script lang="ts">
  import type { A2uiClientEvent } from '@shared/a2ui'
  import A2uiSurface from '../../a2ui/A2uiSurface.svelte'
  import type { SurfaceActivity } from '../../agui/activities'
  import Icon from '../../kit/atoms/Icon.svelte'
  import { surfaceDisplayTitle, surfaceTabLabels } from '../../app/session/surfaceRow'

  interface Props {
    /** The sidebar surfaces whose tab is open, in transcript order. */
    surfaces: readonly SurfaceActivity[]
    sessionId: number
    selected: string | null
    width?: number
    onselect?: (surfaceId: string) => void
    /** The X of a tab: hides the surface (it stays reopenable from its chat row). */
    onclose?: (surface: SurfaceActivity) => void
    onaction?: (event: A2uiClientEvent) => void
    /** True while the agent works on a turn (a form says "Sending..." then "Sent."). */
    running?: boolean
    /** The agent's latest reply as plain text (a form quotes it after Send). */
    reply?: string
  }

  let { surfaces, sessionId, selected, width = $bindable(300), onselect, onclose, onaction, running, reply }: Props = $props()

  const tabLabels = $derived(surfaceTabLabels(surfaces))
  const current = $derived(surfaces.find((s) => s.surfaceId === selected) ?? surfaces[0])

  function startResize(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = width
    const move = (e: PointerEvent): void => void (width = Math.min(640, Math.max(200, startWidth + (startX - e.clientX))))
    const stop = (): void => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', stop)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', stop)
  }

  function resizeKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') width = Math.min(640, width + 16)
    else if (event.key === 'ArrowRight') width = Math.max(200, width - 16)
    else return
    event.preventDefault()
  }
</script>

{#if current}
  <div class="resizer" data-testid="chat-sidebar-resizer" role="slider" aria-orientation="horizontal" aria-valuemin={200} aria-valuemax={640} aria-valuenow={width} aria-label="Sidebar width" tabindex="0" onpointerdown={startResize} onkeydown={resizeKey}></div>
  <aside class="sidebar" data-testid="chat-sidebar" style="width:{width}px" aria-label="Chat sidebar">
    <div class="tabs" role="tablist">
      {#each surfaces as s (s.surfaceId)}
        {@const active = s.surfaceId === current.surfaceId}
        <div class="tab" class:active data-testid="chat-sidebar-tab" data-surface-id={s.surfaceId} data-selected={active}>
          <button type="button" role="tab" aria-selected={active} class="label" title={tabLabels.get(s.surfaceId)?.tooltip} onclick={() => onselect?.(s.surfaceId)}>{tabLabels.get(s.surfaceId)?.label}</button>
          <button type="button" class="x" data-testid="chat-sidebar-tab-close" aria-label="Close {surfaceDisplayTitle(s.messages)}" onclick={() => onclose?.(s)}>
            <Icon name="close" />
          </button>
        </div>
      {/each}
    </div>
    <div class="body w7-scroll" role="tabpanel">
      {#key current.surfaceId}
        <A2uiSurface messages={current.messages} {sessionId} {onaction} busy={running} {reply} />
      {/key}
    </div>
  </aside>
{/if}

<style>
  /* A 24 px wide hit area (WCAG 2.5.8) that takes the room of 5 px; only the middle 5 px is painted. */
  .resizer {
    flex: none;
    box-sizing: border-box;
    width: 24px;
    margin: 0 -9.5px;
    padding: 0 9.5px;
    cursor: col-resize;
    background: transparent content-box;
  }
  .resizer:hover,
  .resizer:focus-visible {
    background: var(--w7-panel-border) content-box;
  }
  .sidebar {
    flex: none;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 4px 4px 0;
    box-sizing: border-box;
  }
  .tabs {
    flex: none;
    display: flex;
    gap: 2px;
    overflow-x: auto;
  }
  .tab {
    display: flex;
    align-items: center;
    border: 1px solid var(--w7-panel-border);
    border-bottom: 0;
    background: #e6edf7;
    font: var(--w7-font);
  }
  .tab.active {
    background: var(--w7-window);
    font-weight: 600;
  }
  .label,
  .x {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: default;
    padding: 3px 6px;
  }
  .x {
    padding: 3px 4px;
    display: inline-flex;
  }
  .x:hover {
    background: #f4c6c0;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
</style>
