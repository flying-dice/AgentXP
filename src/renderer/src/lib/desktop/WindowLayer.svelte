<script lang="ts">
  import type { DesktopController } from './DesktopController.svelte'
  import AppWindowFrame from './AppWindowFrame.svelte'
  import { appRegistry } from './apps'

  interface Props {
    desktop: DesktopController
  }

  let { desktop }: Props = $props()

  let layer: HTMLDivElement | undefined = $state()
  const area = (): { width: number; height: number; top: number } => {
    const r = layer?.getBoundingClientRect()
    return { width: r?.width ?? 1200, height: r?.height ?? 700, top: r?.top ?? 0 }
  }

  // The controller pulls a new Help window inside this area (UX-148).
  $effect(() => {
    desktop.workArea = () => area()
    return () => (desktop.workArea = null)
  })

  // Stable DOM order (by id) so reordering never remounts an app; stacking is done with z-index.
  const windows = $derived(desktop.state.windows)
  const byId = $derived([...windows].sort((a, b) => a.id - b.id))
  const focusedId = $derived(desktop.state.focusedWindowId)
</script>

<div class="layer" bind:this={layer}>
  {#each byId as w (w.id)}
    <AppWindowFrame
      window={w}
      {desktop}
      definition={appRegistry[w.app]}
      focused={w.id === focusedId && w.windowState !== 'minimized'}
      z={windows.indexOf(w) + 1}
      {area}
    />
  {/each}
</div>

<style>
  .layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .layer :global(.appframe) {
    pointer-events: auto;
  }
</style>
