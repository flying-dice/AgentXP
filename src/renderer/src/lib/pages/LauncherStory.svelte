<script lang="ts">
  /** Story harness for the launcher: a fake backend, a fixed clock, and an optional button to press once mounted. */
  import { onMount } from 'svelte'
  import type { DesktopSummaryDto } from '@shared/vfs'
  import { createFakeApi } from '../app/fakeApi'
  import FolderBrowserHost from '../kit/organisms/FolderBrowserHost.svelte'
  import MessageBoxHost from '../kit/organisms/MessageBoxHost.svelte'
  import LauncherPage from './LauncherPage.svelte'

  interface Props {
    desktops?: DesktopSummaryDto[]
    empty?: boolean
    width?: number
    height?: number
    showOptions?: boolean
    dialog?: 'new' | 'rename' | null
    selectedId?: number | null
    /** The caption of a button to click after mounting (for example `Delete...`). */
    press?: string
  }

  let { desktops, empty = false, width = 560, height = 560, showOptions = false, dialog = null, selectedId = null, press }: Props = $props()

  // svelte-ignore state_referenced_locally
  const api = createFakeApi({ desktops: empty ? [] : desktops })
  const now = new Date('2026-11-16T09:32:00Z')
  let root = $state<HTMLDivElement | null>(null)

  onMount(() => {
    if (!press) return
    const timer = setTimeout(() => {
      for (const button of root?.querySelectorAll('button') ?? []) if (button.textContent?.trim() === press) return void button.click()
    }, 120)
    return () => clearTimeout(timer)
  })
</script>

<div class="stage" bind:this={root} style:width="{width}px" style:height="{height}px">
  <LauncherPage {api} {now} {showOptions} {dialog} {selectedId} />
  <MessageBoxHost contained />
  <FolderBrowserHost contained />
</div>

<style>
  .stage {
    position: relative;
    margin: 16px;
    overflow: hidden;
    background: var(--xp-desktop-bg);
  }
</style>
