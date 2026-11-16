<script lang="ts">
  /** A small "Save As" box: one file name, saved in the Documents folder of the app that shows it. */
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { INVALID_FILE_NAME_TEXT, isValidFileName } from './fileName'

  interface Props {
    /** The caption of the app, for the error box. */
    caption: string
    /** The name shown first. */
    name?: string
    /** Called with the trimmed, valid name. */
    onsave: (name: string) => void
    onclose: () => void
  }

  let { caption, name = 'Document.txt', onsave, onclose }: Props = $props()
  // svelte-ignore state_referenced_locally
  let value = $state(name)

  async function finish(result: DialogResult): Promise<void> {
    if (result !== 'ok') return onclose()
    if (!isValidFileName(value)) {
      await showMessageBox({ text: INVALID_FILE_NAME_TEXT, caption, buttons: 'OK', icon: 'error' })
      return
    }
    onsave(value.trim())
  }
</script>

<Dialog testid="save-as-dialog" title="Save as" iconName="save" width="340px" contained {onclose}>
  <div class="saveas">
    <label for="save-as-name">File name:</label>
    <TextBox id="save-as-name" data-testid="save-as-name" bind:value onkeydown={(e) => e.key === 'Enter' && void finish('ok')} />
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={(r) => void finish(r)} />
  {/snippet}
</Dialog>

<style>
  .saveas {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
  }
</style>
