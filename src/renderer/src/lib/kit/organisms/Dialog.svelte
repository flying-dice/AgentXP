<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { IconName } from '../atoms/icons'
  import { focusTrap } from '../actions/focusTrap'
  import Form from './Form.svelte'

  interface Props {
    open?: boolean
    title?: string
    iconName?: IconName
    icon?: Snippet
    /** CSS width of the dialog window. */
    width?: string
    /** Esc and the close box call `onclose`; false disables both (like a YesNo MessageBox). */
    closable?: boolean
    /** Position the overlay inside the nearest positioned ancestor instead of the viewport. */
    contained?: boolean
    bodyColor?: 'face' | 'window'
    children?: Snippet
    /** The button bar (typically `<DialogButtons />`). */
    buttons?: Snippet
    onclose?: () => void
    role?: 'dialog' | 'alertdialog'
    class?: string
  }

  let {
    open = true,
    title = '',
    iconName,
    icon,
    width = '400px',
    closable = true,
    contained = false,
    bodyColor = 'face',
    children,
    buttons,
    onclose,
    role = 'dialog',
    class: className = ''
  }: Props = $props()

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.stopPropagation()
    if (closable) {
      event.preventDefault()
      onclose?.()
    }
  }
</script>

{#if open}
  <!-- Win7 dialogs do not dim the owner; the transparent overlay only blocks interaction. -->
  <div class="w7-dialog-overlay" class:contained>
    <div class="holder" use:focusTrap role="presentation" onkeydown={onKeydown}>
      <Form
        {title}
        {iconName}
        {icon}
        dialog
        {role}
        aria-modal={true}
        {width}
        height="auto"
        {bodyColor}
        sizeGrip={false}
        {closable}
        {onclose}
        class="w7-dialog {className}"
      >
        <div class="content">{@render children?.()}</div>
        {#if buttons}<div class="bar">{@render buttons()}</div>{/if}
      </Form>
    </div>
  </div>
{/if}

<style>
  .w7-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }
  .w7-dialog-overlay.contained {
    position: absolute;
  }
  .holder {
    display: contents;
  }
  .content {
    flex: 1;
    min-height: 0;
  }
  .bar {
    flex: none;
    padding: 12px 12px 12px;
    background: var(--w7-face);
    border-top: 1px solid #dfdfdf;
  }
</style>
