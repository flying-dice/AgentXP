<script lang="ts">
  import DialogButtons from '../molecules/DialogButtons.svelte'
  import { cancelResultFor, type MessageBoxButtons } from '../molecules/DialogButtons'
  import MessageIcon from '../molecules/MessageIcon.svelte'
  import type { MessageIconKind } from '../molecules/MessageIcon'
  import Button from '../atoms/Button.svelte'
  import { resultsFor, type MessageBoxAction } from './messageBox'
  import Dialog from './Dialog.svelte'

  interface Props {
    open?: boolean
    text: string
    caption?: string
    buttons?: MessageBoxButtons
    icon?: MessageIconKind | 'none'
    defaultButton?: number
    contained?: boolean
    /** Buttons with their own words in place of `buttons`; `onresult` gets the id of the one picked (Esc: the last). */
    actions?: readonly MessageBoxAction[]
    onresult?: (result: string) => void
  }

  let {
    open = true,
    text,
    caption = '',
    buttons: boxButtons = 'OK',
    icon = 'information',
    defaultButton = 0,
    contained = false,
    actions,
    onresult
  }: Props = $props()

  const results = $derived(resultsFor(boxButtons))
  const cancel = $derived(cancelResultFor(results))
  const accept = $derived(results[Math.min(defaultButton, results.length - 1)])
  const role = $derived(icon === 'error' || icon === 'warning' ? 'alertdialog' : 'dialog')
</script>

<Dialog
  testid="message-box"
  {open}
  title={caption}
  width="auto"
  bodyColor="window"
  {contained}
  {role}
  closable={actions ? actions.length > 0 : cancel !== undefined}
  onclose={() => (actions ? actions.length > 0 && onresult?.(actions[actions.length - 1]!.id) : cancel && onresult?.(cancel))}
  class="w7-messagebox"
>
  <div class="message">
    {#if icon !== 'none'}<MessageIcon kind={icon} />{/if}
    <p class="text">{text}</p>
  </div>
  {#snippet buttons()}
    {#if actions}
      <div class="actions">
        {#each actions as action, i (action.id)}
          <Button isDefault={i === Math.min(defaultButton, actions.length - 1)} data-testid="message-box-action-{action.id}" data-autofocus={i === Math.min(defaultButton, actions.length - 1) ? '' : undefined} onclick={() => onresult?.(action.id)}>{action.label}</Button>
        {/each}
      </div>
    {:else}
      <DialogButtons buttons={results} acceptButton={accept} cancelButton={cancel ?? 'none'} {onresult} />
    {/if}
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
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .actions :global(.w7-btn) {
    min-width: 75px;
    width: auto;
  }
  .text {
    margin: 0;
    align-self: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
</style>
