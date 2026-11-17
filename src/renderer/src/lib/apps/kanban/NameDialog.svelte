<script lang="ts">
  /** A one-line prompt (new board, new list, rename): a name and OK / Cancel. */
  import Button from '../../kit/atoms/Button.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'

  interface Props {
    title: string
    label: string
    value?: string
    /** Prefix of the test ids: `<testid>-input`, `<testid>-ok`, `<testid>-cancel`. */
    testid?: string
    onok?: (value: string) => void
    oncancel?: () => void
  }

  let { title, label, value = '', testid = 'kanban-name', onok, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let text = $state(value)
  const ready = $derived(text.trim().length > 0)
  const accept = (): void => {
    if (ready) onok?.(text.trim())
  }
</script>

<Dialog {testid} {title} iconName="kanban" width="340px" contained onclose={() => oncancel?.()}>
  <form
    class="body"
    onsubmit={(e) => {
      e.preventDefault()
      accept()
    }}
  >
    <label>
      <span>{label}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <TextBox data-testid="{testid}-input" bind:value={text} autofocus aria-label={label} />
    </label>
  </form>
  {#snippet buttons()}
    <Button data-testid="{testid}-ok" isDefault disabled={!ready} onclick={accept}>OK</Button>
    <Button data-testid="{testid}-cancel" onclick={() => oncancel?.()}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    padding: 12px 14px 8px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
