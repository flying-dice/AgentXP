<script lang="ts">
  import type { Snippet } from 'svelte'
  import Taskbar, { type TaskbarItem } from '../organisms/Taskbar.svelte'

  interface Props {
    taskbarItems?: TaskbarItem[]
    clock?: Date
    showTaskbar?: boolean
    startOpen?: boolean
    onstart?: () => void
    onitemclick?: (item: TaskbarItem) => void
    /** Windows: position them absolutely inside this area. */
    children?: Snippet
    tray?: Snippet
    class?: string
  }

  let { taskbarItems = [], clock, showTaskbar = true, startOpen = false, onstart, onitemclick, children, tray, class: className = '' }: Props = $props()
</script>

<div class="w7-desktop {className}">
  <div class="area">{@render children?.()}</div>
  {#if showTaskbar}
    <Taskbar items={taskbarItems} {clock} {tray} {startOpen} {onstart} {onitemclick} />
  {/if}
</div>

<style>
  .w7-desktop {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    font: var(--w7-font);
    color: var(--w7-text);
    background: var(--w7-desktop-bg);
  }
  .area {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
