<script lang="ts">
  import { windowHasAside, type AppWindowState, type Bounds } from '@shared/desktop'
  import type { AppDefinition } from '../apps/types'
  import Icon from '../kit/atoms/Icon.svelte'
  import Form from '../kit/organisms/Form.svelte'
  import AppChatPane from './AppChatPane.svelte'
  import type { DesktopController } from './DesktopController.svelte'
  import { minWindowSize } from '@shared/desktop-views'
  import { RESIZE_EDGES, frameStyle, moveBounds, resizeBounds, shouldSnapMaximize, type ResizeEdge, type Size } from './geometry'
  import UnknownApp from './UnknownApp.svelte'

  interface Props {
    window: AppWindowState
    definition?: AppDefinition
    desktop: DesktopController
    focused: boolean
    /** Stacking position (1 = back). */
    z: number
    /** Size of the desktop area the window lives in, and its top edge in viewport coordinates. */
    area: () => Size & { top: number }
  }

  let { window: w, definition, desktop, focused, z, area }: Props = $props()

  type Gesture = { kind: 'move' } | { kind: 'resize'; edge: ResizeEdge }
  let gesture: (Gesture & { x: number; y: number; start: Bounds; moved: boolean }) | null = null

  const maximized = $derived(w.windowState === 'maximized')
  const minimized = $derived(w.windowState === 'minimized')
  const bounds = $derived(desktop.boundsOf(w))
  const glowing = $derived(desktop.glowing.has(w.id))
  const App = $derived(definition?.component)
  const hasPane = $derived(windowHasAside(w))
  let hostedWidth = $state(0)

  /** Ctrl+Shift+C anywhere inside the window: show or hide its chat pane (the shortcut of View > Chat pane). */
  function onKeyDown(event: KeyboardEvent): void {
    if (!hasPane || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey || event.key.toLowerCase() !== 'c') return
    event.preventDefault()
    event.stopPropagation()
    desktop.toggleChatPane(w.id)
  }

  function onPointerDown(event: PointerEvent): void {
    if (!focused) void desktop.focusWindow(w.id)
    if (event.button !== 0 || maximized) return
    const target = event.target as HTMLElement
    const edge = target.dataset.edge as ResizeEdge | undefined
    const onTitle = !edge && !!target.closest('.xp-titlebar') && !target.closest('button')
    if (!edge && !onTitle) return
    gesture = { kind: edge ? 'resize' : 'move', ...(edge ? { edge } : {}), x: event.clientX, y: event.clientY, start: bounds, moved: false } as typeof gesture
    target.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent): void {
    if (!gesture) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.moved && Math.abs(dx) + Math.abs(dy) < 3) return
    gesture.moved = true
    const a = area()
    desktop.moveLocal(w.id, gesture.kind === 'move' ? moveBounds(gesture.start, dx, dy, a) : resizeBounds(gesture.start, gesture.edge, dx, dy, a, minWindowSize(w.app)))
  }

  function onPointerUp(event: PointerEvent): void {
    if (!gesture) return
    const g = gesture
    gesture = null
    if (!g.moved) return
    if (g.kind === 'move' && shouldSnapMaximize(event.clientY - area().top)) {
      void desktop.commitBounds(w.id).then(() => desktop.maximize(w.id))
    } else void desktop.commitBounds(w.id)
  }

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="appframe"
  class:minimized
  class:glow={glowing}
  style="{frameStyle(bounds, maximized)}z-index:{z}"
  data-testid="window-{w.view.app}"
  data-window-id={w.id}
  data-window-state={w.windowState}
  data-focused={focused}
  data-region={focused ? 'window' : undefined}
  onpointerdowncapture={onPointerDown}
  onkeydowncapture={onKeyDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={() => {
    gesture = null
    desktop.cancelLocal(w.id)
  }}
>
  <Form
    title={w.title}
    iconName={definition?.icon}
    active={focused}
    windowState={maximized ? 'Maximized' : 'Normal'}
    onminimize={() => void desktop.minimize(w.id)}
    onmaximize={() => void desktop.maximize(w.id)}
    onrestore={() => void desktop.restore(w.id)}
    onclose={() => void desktop.closeWindow(w.id)}
    bodyColor="window"
  >
    <div class="hosted" bind:clientWidth={hostedWidth}>
      <div class="client-app">
        {#if App}
          <App window={w} host={desktop} {focused} />
        {:else}
          <UnknownApp window={w} />
        {/if}
      </div>
      {#if hasPane}
        <AppChatPane window={w} {desktop} available={hostedWidth} />
      {/if}
    </div>
  </Form>
  {#if w.openedBy === 'agent'}
    <span class="badge" class:inactive={!focused} title="The agent opened this window"><Icon name="agentxp" size={12} />opened by agent</span>
  {/if}
  {#if !maximized}
    {#each RESIZE_EDGES as edge (edge)}
      <div class="grip {edge}" data-edge={edge}></div>
    {/each}
  {/if}
</div>

<style>
  .appframe {
    position: absolute;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .hosted {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
  }
  .client-app {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .appframe.minimized {
    display: none;
  }
  .appframe.glow {
    animation: agent-glow 1.8s ease-out 1;
  }
  @keyframes agent-glow {
    0% {
      box-shadow: var(--xp-agent-glow);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 190, 70, 0);
    }
  }
  .badge {
    position: absolute;
    top: 8px;
    right: 112px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 16px;
    padding: 0 6px 0 4px;
    border: 1px solid rgba(39, 64, 95, 0.55);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    line-height: 1;
    color: #1d3a63;
    pointer-events: none;
    white-space: nowrap;
  }
  .badge.inactive {
    opacity: 0.7;
  }
  .appframe:has(:global(.xp-form.maximized)) .badge {
    right: 106px;
    top: 5px;
  }
  .grip {
    position: absolute;
    z-index: 3;
  }
  .grip.n,
  .grip.s {
    left: 8px;
    right: 8px;
    height: 6px;
    cursor: ns-resize;
  }
  .grip.n {
    top: -3px;
  }
  .grip.s {
    bottom: -3px;
  }
  .grip.e,
  .grip.w {
    top: 8px;
    bottom: 8px;
    width: 6px;
    cursor: ew-resize;
  }
  .grip.e {
    right: -3px;
  }
  .grip.w {
    left: -3px;
  }
  .grip.ne,
  .grip.nw,
  .grip.se,
  .grip.sw {
    width: 12px;
    height: 12px;
  }
  .grip.ne {
    top: -4px;
    right: -4px;
    cursor: nesw-resize;
  }
  .grip.nw {
    top: -4px;
    left: -4px;
    cursor: nwse-resize;
  }
  .grip.se {
    bottom: -4px;
    right: -4px;
    cursor: nwse-resize;
  }
  .grip.sw {
    bottom: -4px;
    left: -4px;
    cursor: nesw-resize;
  }
</style>
