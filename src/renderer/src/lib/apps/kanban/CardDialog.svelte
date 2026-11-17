<script lang="ts">
  /** A card's properties: title, description and assignee. */
  import type { CardInput } from '@shared/kanban'
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { ComboItem } from '../../kit/atoms/ComboBox'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'

  interface Props {
    /** "New card" or "Card properties". */
    title: string
    card?: { title: string; description: string; assignee: string | null }
    assignees: ComboItem[]
    onok?: (card: Required<CardInput>) => void
    oncancel?: () => void
  }

  let { title, card, assignees, onok, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let name = $state(card?.title ?? '')
  // svelte-ignore state_referenced_locally
  let description = $state(card?.description ?? '')
  // svelte-ignore state_referenced_locally
  let assignee = $state(card?.assignee ?? '')
  const ready = $derived(name.trim().length > 0)
  const accept = (): void => {
    if (ready) onok?.({ title: name.trim(), description, assignee: assignee.trim() || null })
  }
</script>

<Dialog testid="kanban-card-dialog" {title} iconName="kanban" width="420px" contained onclose={() => oncancel?.()}>
  <div class="body">
    <label>
      <span>Title:</span>
      <!-- svelte-ignore a11y_autofocus -->
      <TextBox data-testid="kanban-card-dialog-title" bind:value={name} autofocus aria-label="Title" />
    </label>
    <label>
      <span>Description:</span>
      <TextBox data-testid="kanban-card-dialog-description" bind:value={description} multiline rows={6} aria-label="Description" />
    </label>
    <label>
      <span>Assignee:</span>
      <ComboBox testid="kanban-card-dialog-assignee" items={assignees} dropDownStyle="DropDown" placeholder="Nobody" bind:value={assignee} aria-label="Assignee" />
    </label>
  </div>
  {#snippet buttons()}
    <Button data-testid="kanban-card-dialog-ok" isDefault disabled={!ready} onclick={accept}>OK</Button>
    <Button data-testid="kanban-card-dialog-cancel" onclick={() => oncancel?.()}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px 8px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
</style>
