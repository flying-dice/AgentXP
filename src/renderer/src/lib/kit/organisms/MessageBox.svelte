<script lang="ts">
  import DialogButtons from '../molecules/DialogButtons.svelte'
  import { cancelResultFor, type DialogResult, type MessageBoxButtons } from '../molecules/DialogButtons'
  import MessageIcon from '../molecules/MessageIcon.svelte'
  import type { MessageIconKind } from '../molecules/MessageIcon'
  import { resultsFor } from './messageBox'
  import Dialog from './Dialog.svelte'

  interface Props {
    open?: boolean
    text: string
    caption?: string
    buttons?: MessageBoxButtons
    icon?: MessageIconKind | 'none'
    defaultButton?: number
    contained?: boolean
    onresult?: (result: DialogResult) => void
  }

  let {
    open = true,
    text,
    caption = '',
    buttons: boxButtons = 'OK',
    icon = 'information',
    defaultButton = 0,
    contained = false,
    onresult
  }: Props = $props()

  const results = $derived(resultsFor(boxButtons))
  const cancel = $derived(cancelResultFor(results))
  const accept = $derived(results[Math.min(defaultButton, results.length - 1)])
  const role = $derived(icon === 'error' || icon === 'warning' ? 'alertdialog' : 'dialog')
</script>

<Dialog
  {open}
  title={caption}
  width="auto"
  bodyColor="window"
  {contained}
  {role}
  closable={cancel !== undefined}
  onclose={() => cancel && onresult?.(cancel)}
  class="w7-messagebox"
>
  <div class="message">
    {#if icon !== 'none'}<MessageIcon kind={icon} />{/if}
    <p class="text">{text}</p>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={results} acceptButton={accept} cancelButton={cancel ?? 'none'} {onresult} />
  {/snippet}
</Dialog>

<style>
  :global(.w7-messagebox) {
    min-width: 260px;
    max-width: 520px;
  }
  .message {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 20px 22px 20px 18px;
    min-height: 62px;
    background: var(--w7-window);
  }
  .text {
    margin: 0;
    align-self: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
</style>
