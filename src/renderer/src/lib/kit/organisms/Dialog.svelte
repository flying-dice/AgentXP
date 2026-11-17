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
    /** CSS height; default `auto` (fits the content). */
    height?: string
    /** The content fills the dialog's height (a resizable dialog); default sizes to the content. */
    fill?: boolean
    /** Extra inline style of the dialog frame (for example `min-width` and `resize` of a resizable dialog). */
    style?: string
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
    /** `data-testid` of the dialog frame. */
    testid?: string
  }

  let {
    open = true,
    title = '',
    iconName,
    icon,
    width = '400px',
    height = 'auto',
    style = '',
    fill = false,
    closable = true,
    contained = false,
    bodyColor = 'face',
    children,
    buttons,
    onclose,
    role = 'dialog',
    class: className = '',
    testid
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
  <!-- WinXP dialogs do not dim the owner; the transparent overlay only blocks interaction. -->
  <div class="xp-dialog-overlay" class:contained>
    <div class="holder" use:focusTrap role="presentation" onkeydown={onKeydown}>
      <Form
        {title}
        {iconName}
        {icon}
        dialog
        {role}
        aria-modal={true}
        {width}
        {height}
        {style}
        {bodyColor}
        sizeGrip={false}
        {closable}
        {onclose}
        {testid}
        class="xp-dialog {className}"
      >
        <div class="content" class:fill>{@render children?.()}</div>
        {#if buttons}<div class="bar">{@render buttons()}</div>{/if}
      </Form>
    </div>
  </div>
{/if}

<style>
  .xp-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }
  .xp-dialog-overlay.contained {
    position: absolute;
  }
  .holder {
    display: contents;
  }
  .content {
    flex: 1;
    min-height: 0;
  }
  .content.fill {
    display: flex;
    flex-direction: column;
  }
  .bar {
    flex: none;
    padding: 12px 12px 12px;
    background: var(--xp-face);
    border-top: 1px solid #dfdfdf;
  }
</style>
