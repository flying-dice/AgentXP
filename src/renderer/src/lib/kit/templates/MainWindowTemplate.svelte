<script lang="ts">
  import type { Snippet } from 'svelte'
  import Splitter from '../atoms/Splitter.svelte'
  import type { IconName } from '../atoms/icons'
  import type { WindowState } from '../molecules/CaptionButtons.svelte'
  import Form from '../organisms/Form.svelte'

  interface Props {
    title?: string
    iconName?: IconName
    /** Window has focus: saturated Aero frame. */
    active?: boolean
    windowState?: WindowState
    /** Title bar is an Electron drag region. */
    draggable?: boolean
    /** Width of the left pane in px. */
    leftWidth?: number
    /** Width of the right pane in px. */
    rightWidth?: number
    leftMinWidth?: number
    rightMinWidth?: number
    /** The centre pane never gets narrower than this. */
    centerMinWidth?: number
    menu?: Snippet
    toolbar?: Snippet
    statusbar?: Snippet
    left: Snippet
    center: Snippet
    right: Snippet
    /** Overlays (dialogs, message boxes) rendered inside the client area. */
    overlays?: Snippet
    onminimize?: () => void
    onmaximize?: () => void
    onrestore?: () => void
    onclose?: () => void
    onactivate?: () => void
    onresize?: (sizes: { leftWidth: number; rightWidth: number }) => void
    class?: string
  }

  let {
    title = '',
    iconName = 'agent7',
    active = true,
    windowState = $bindable('Normal'),
    draggable = true,
    leftWidth = $bindable(250),
    rightWidth = $bindable(330),
    leftMinWidth = 160,
    rightMinWidth = 240,
    centerMinWidth = 320,
    menu,
    toolbar,
    statusbar,
    left,
    center,
    right,
    overlays,
    onminimize,
    onmaximize,
    onrestore,
    onclose,
    onactivate,
    onresize,
    class: className = ''
  }: Props = $props()

  const SPLITTER = 4
  let bodyWidth = $state(0)

  const clamp = (value: number, min: number, otherPane: number): number => {
    const max = bodyWidth > 0 ? bodyWidth - 8 - 2 * SPLITTER - otherPane - centerMinWidth : Infinity
    return Math.max(min, Math.min(value, Math.max(min, max)))
  }

  function resizeLeft(delta: number): void {
    leftWidth = clamp(leftWidth + delta, leftMinWidth, rightWidth)
    onresize?.({ leftWidth, rightWidth })
  }

  function resizeRight(delta: number): void {
    rightWidth = clamp(rightWidth - delta, rightMinWidth, leftWidth)
    onresize?.({ leftWidth, rightWidth })
  }
</script>

<Form
  {title}
  {iconName}
  {active}
  bind:windowState
  {draggable}
  sizeGrip={false}
  {menu}
  {toolbar}
  {statusbar}
  {onminimize}
  {onmaximize}
  {onrestore}
  {onclose}
  {onactivate}
  class="w7-mainwindow {className}"
>
  <div class="panes" bind:clientWidth={bodyWidth}>
    <section class="pane left" style="width:{leftWidth}px" aria-label="Explorer">{@render left()}</section>
    <Splitter orientation="vertical" onresize={resizeLeft} />
    <section class="pane center" aria-label="Session">{@render center()}</section>
    <Splitter orientation="vertical" onresize={resizeRight} />
    <section class="pane right" style="width:{rightWidth}px" aria-label="Inspector">{@render right()}</section>
  </div>
  {@render overlays?.()}
</Form>

<style>
  .panes {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
  }
  .pane {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .left,
  .right {
    flex: none;
  }
  .center {
    flex: 1;
  }
</style>
