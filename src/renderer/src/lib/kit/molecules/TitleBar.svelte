<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'
  import CaptionButtons, { type WindowState } from './CaptionButtons.svelte'

  interface Props {
    title?: string
    /** Built-in 16px icon name, or pass the `icon` snippet for custom art. */
    iconName?: IconName
    icon?: Snippet
    active?: boolean
    windowState?: WindowState
    /** Dialog style: only the close box. */
    dialog?: boolean
    /** Mark the bar as an Electron drag region (`-webkit-app-region: drag`). */
    draggable?: boolean
    closeEnabled?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    onrestore?: () => void
    onclose?: () => void
    class?: string
  }

  let {
    title = '',
    iconName,
    icon,
    active = true,
    windowState = 'Normal',
    dialog = false,
    draggable = false,
    closeEnabled = true,
    onminimize,
    onmaximize,
    onrestore,
    onclose,
    class: className = ''
  }: Props = $props()

  const toggle = (): void => {
    if (dialog) return
    if (windowState === 'Maximized') onrestore?.()
    else onmaximize?.()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="w7-titlebar {className}" class:inactive={!active} class:drag={draggable} ondblclick={toggle}>
  <span class="app-icon">
    {#if icon}{@render icon()}{:else if iconName}<Icon name={iconName} />{/if}
  </span>
  <span class="text" data-testid="window-title">{title}</span>
  <CaptionButtons
    {windowState}
    {active}
    {closeEnabled}
    minimizeBox={!dialog}
    maximizeBox={!dialog}
    {onminimize}
    {onmaximize}
    {onrestore}
    {onclose}
  />
</div>

<style>
  .w7-titlebar {
    flex: none;
    height: 30px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding-left: 2px;
    font: var(--w7-font);
    color: #000;
    overflow: hidden;
  }
  .drag {
    -webkit-app-region: drag;
  }
  .app-icon {
    display: inline-flex;
    flex: none;
  }
  .text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: var(--w7-title-glow);
  }
  .inactive .text {
    color: #4d5560;
    text-shadow: 0 0 6px #fff, 0 0 3px #fff;
  }
</style>
