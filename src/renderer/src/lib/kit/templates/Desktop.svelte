<script lang="ts">
  import type { Snippet } from 'svelte'
  import Taskbar, { type TaskbarItem } from '../organisms/Taskbar.svelte'

  interface Props {
    taskbarItems?: TaskbarItem[]
    clock?: Date
    showTaskbar?: boolean
    startOpen?: boolean
    onstart?: () => void
    onitemclick?: (item: TaskbarItem, via: { keyboard: boolean }) => void
    onitemcontext?: (item: TaskbarItem, at: { x: number; y: number }) => void
    /** Windows: position them absolutely inside this area. */
    children?: Snippet
    tray?: Snippet
    class?: string
  }

  let { taskbarItems = [], clock, showTaskbar = true, startOpen = false, onstart, onitemclick, onitemcontext, children, tray, class: className = '' }: Props = $props()
</script>

<div class="xp-desktop {className}">
  <div class="area">{@render children?.()}</div>
  {#if showTaskbar}
    <Taskbar items={taskbarItems} {clock} {tray} {startOpen} {onstart} {onitemclick} {onitemcontext} />
  {/if}
</div>

<style>
  .xp-desktop {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    font: var(--xp-font);
    color: var(--xp-text);
    background: var(--xp-desktop-bg);
  }
  .area {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
