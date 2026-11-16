<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { IconName } from '../atoms/icons'
  import TitleBar from '../molecules/TitleBar.svelte'
  import type { WindowState } from '../molecules/CaptionButtons.svelte'

  interface Props {
    title?: string
    iconName?: IconName
    icon?: Snippet
    /** Active windows get the saturated Aero frame, inactive ones the pale one. */
    active?: boolean
    windowState?: WindowState
    /** Render only the client chrome, for use inside a real window that already has a frame. */
    frameless?: boolean
    /** Fixed dialog border: close box only, no minimize / maximize. */
    dialog?: boolean
    /** Title bar is an Electron drag region. */
    draggable?: boolean
    /** False greys out the close box. */
    closable?: boolean
    /** Show the sizing grip in the bottom-right corner of the client area. */
    sizeGrip?: boolean
    /** Client area background. */
    bodyColor?: 'face' | 'window'
    /** CSS lengths for the outer size (ignored when maximized). */
    width?: string
    height?: string
    menu?: Snippet
    toolbar?: Snippet
    statusbar?: Snippet
    children?: Snippet
    onminimize?: () => void
    onmaximize?: () => void
    onrestore?: () => void
    onclose?: () => void
    /** Pointer press anywhere on an inactive form. */
    onactivate?: () => void
    class?: string
    style?: string
    role?: 'dialog' | 'alertdialog' | 'group' | 'application'
    'aria-modal'?: boolean
  }

  let {
    title = '',
    iconName,
    icon,
    active = true,
    windowState = $bindable('Normal'),
    frameless = false,
    dialog = false,
    draggable = false,
    closable = true,
    sizeGrip,
    bodyColor = 'face',
    width = '100%',
    height = '100%',
    menu,
    toolbar,
    statusbar,
    children,
    onminimize,
    onmaximize,
    onrestore,
    onclose,
    onactivate,
    class: className = '',
    style = '',
    role,
    'aria-modal': ariaModal
  }: Props = $props()

  const maximized = $derived(windowState === 'Maximized' && !dialog)
  const grip = $derived(sizeGrip ?? (!dialog && !maximized))
  const titleId = $props.id()

  const maximize = (): void => {
    windowState = 'Maximized'
    onmaximize?.()
  }
  const restore = (): void => {
    windowState = 'Normal'
    onrestore?.()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="w7-form {className}"
  class:frameless
  class:inactive={!active}
  class:maximized
  class:dialog
  data-w7-form
  role={role ?? (dialog ? 'dialog' : 'group')}
  aria-modal={ariaModal}
  aria-labelledby={frameless ? undefined : titleId}
  aria-label={frameless ? title || undefined : undefined}
  style="{maximized || frameless ? '' : `width:${width};height:${height};`}{style}"
  onpointerdown={() => {
    if (!active) onactivate?.()
  }}
>
  {#if !frameless}
    <TitleBar
      {title}
      {iconName}
      {icon}
      {active}
      {windowState}
      {dialog}
      {draggable}
      closeEnabled={closable}
      {onminimize}
      onmaximize={maximize}
      onrestore={restore}
      {onclose}
      class="form-title"
    />
    <span id={titleId} class="sr-only">{title}</span>
  {/if}
  <div class="client" class:window={bodyColor === 'window'}>
    {@render menu?.()}
    {@render toolbar?.()}
    <div class="body">{@render children?.()}</div>
    {@render statusbar?.()}
    {#if grip}
      <svg class="grip" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <g stroke="#fff" stroke-width="2"><line x1="14" y1="5" x2="5" y2="14" /><line x1="14" y1="9" x2="9" y2="14" /><line x1="14" y1="13" x2="13" y2="14" /></g>
        <g stroke="#9a9a9a" stroke-width="2"><line x1="14" y1="4" x2="4" y2="14" /><line x1="14" y1="8" x2="8" y2="14" /><line x1="14" y1="12" x2="12" y2="14" /></g>
      </svg>
    {/if}
  </div>
</div>

<style>
  .w7-form {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0 7px 7px;
    border: 1px solid var(--w7-frame-border);
    border-radius: 8px 8px 0 0;
    background: var(--w7-frame-active);
    box-shadow: var(--w7-frame-shadow);
    font: var(--w7-font);
    color: var(--w7-text);
    min-width: 0;
    min-height: 0;
  }
  .w7-form.inactive {
    border-color: var(--w7-frame-inactive-border);
    background: var(--w7-frame-inactive);
    box-shadow: var(--w7-frame-shadow-inactive);
  }
  .w7-form.maximized {
    position: absolute;
    inset: 0;
    width: auto;
    height: auto;
    padding: 0 0 0;
    border: 0;
    border-radius: 0;
  }
  .w7-form.maximized :global(.form-title) {
    padding-left: 6px;
  }
  .w7-form.frameless {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    box-shadow: none;
    width: 100%;
    height: 100%;
  }
  .client {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
    border: 1px solid var(--w7-client-border);
  }
  .client.window {
    background: var(--w7-window);
  }
  .w7-form.frameless .client {
    border: 0;
  }
  .w7-form.maximized .client {
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }
  .body {
    position: relative;
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .grip {
    position: absolute;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 5;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
