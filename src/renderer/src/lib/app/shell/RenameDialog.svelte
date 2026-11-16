<script lang="ts">
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'

  interface Props {
    title?: string
    label?: string
    value: string
    /** Called with the trimmed new text when OK is pressed. */
    onrename?: (value: string) => void
    onclose?: () => void
  }

  let { title = 'Rename Session', label = 'Name:', value, onrename, onclose }: Props = $props()

  // svelte-ignore state_referenced_locally
  let draft = $state(value)
  let box = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const valid = $derived(draft.trim().length > 0)

  $effect(() => {
    box?.focus()
    if (box instanceof HTMLInputElement) box.select()
  })

  function result(r: DialogResult): void {
    if (r === 'ok' && valid) onrename?.(draft.trim())
    onclose?.()
  }
</script>

<Dialog {title} iconName="edit" width="380px" {onclose}>
  <LabeledField {label} for="rename-input" labelWidth={50}>
    <TextBox id="rename-input" bind:value={draft} bind:ref={box} />
  </LabeledField>
  {#snippet buttons()}
    <DialogButtons buttons={[{ result: 'ok', disabled: !valid }, 'cancel']} onresult={result} />
  {/snippet}
</Dialog>
