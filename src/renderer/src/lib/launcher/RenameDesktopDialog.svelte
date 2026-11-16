<script lang="ts">
  import DialogButtons from '../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../kit/molecules/DialogButtons'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import DesktopNameField from './DesktopNameField.svelte'
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
  const error = $derived(validateDesktopName(name, existingNames))

  function result(r: DialogResult): void {
    if (r === 'cancel') return oncancel?.()
    if (!error) onrename?.(name.trim())
  }
</script>

<Dialog testid="rename-desktop-dialog" title="Rename desktop" iconName="edit" width="380px" contained onclose={oncancel}>
  <div class="form">
    <DesktopNameField bind:value={name} label="New name:" {existingNames} idPrefix="rename-desktop" />
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={[{ result: 'ok', disabled: error !== null }, 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .form {
    padding: 12px 14px 0;
  }
</style>
