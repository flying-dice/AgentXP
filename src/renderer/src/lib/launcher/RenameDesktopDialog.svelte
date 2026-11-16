<script lang="ts">
  import Label from '../kit/atoms/Label.svelte'
  import TextBox from '../kit/atoms/TextBox.svelte'
  import DialogButtons from '../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../kit/molecules/DialogButtons'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import { validateDesktopName } from './launcherModel'

  interface Props {
    title: string
    /** Names of the other desktops. */
    existingNames?: string[]
    onrename?: (title: string) => void
    oncancel?: () => void
  }

  let { title, existingNames = [], onrename, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let name = $state(title)
  let touched = $state(false)
  const error = $derived(validateDesktopName(name, existingNames))

  function result(r: DialogResult): void {
    if (r === 'cancel') return oncancel?.()
    touched = true
    if (!error) onrename?.(name.trim())
  }
</script>

<Dialog testid="rename-desktop-dialog" title="Rename desktop" iconName="edit" width="340px" contained onclose={oncancel}>
  <div class="form">
    <Label text="New name:" for="rn-name" />
    <TextBox id="rn-name" data-testid="rename-desktop-name" bind:value={name} data-autofocus onfocus={(e) => (e.currentTarget as HTMLInputElement).select()} />
    <span class="error" data-testid="rename-desktop-error" role="alert">{touched && error ? error : ''}</span>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px 0;
  }
  .error {
    min-height: 15px;
    color: #a01408;
  }
</style>
