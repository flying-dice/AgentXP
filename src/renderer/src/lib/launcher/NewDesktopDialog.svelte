<script lang="ts">
  /** "New desktop": a name, the projects to plug in as USB drives, and the agent. */
  import type { AgentDto, FolderDto, Id } from '@shared/models'
  import type { NewDesktopInput } from '@shared/vfs'
  import Button from '../kit/atoms/Button.svelte'
  import CheckedListBox from '../kit/atoms/CheckedListBox.svelte'
  import ComboBox from '../kit/atoms/ComboBox.svelte'
  import Label from '../kit/atoms/Label.svelte'
  import TextBox from '../kit/atoms/TextBox.svelte'
  import DialogButtons from '../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../kit/molecules/DialogButtons'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import { validateDesktopName } from './launcherModel'

  interface Props {
    folders: FolderDto[]
    agents: AgentDto[]
    /** Names of the existing desktops (no duplicates). */
    existingNames?: string[]
    /** The Browse... button: shows the folder picker; resolves the new folder, or null when cancelled. */
    onbrowse?: () => Promise<FolderDto | null>
    oncreate?: (input: NewDesktopInput) => void
    oncancel?: () => void
  }

  let { folders, agents, existingNames = [], onbrowse, oncreate, oncancel }: Props = $props()

  let name = $state('New desktop')
  let checked = $state<Id[]>([])
  // svelte-ignore state_referenced_locally
  let agentId = $state('')
  // The agents arrive after the dialog opened: pick the default one once.
  $effect(() => {
    if (agentId === '' && agents.length > 0) agentId = String((agents.find((a) => a.isDefault) ?? agents[0]).id)
  })
  let shown = $state.raw<FolderDto[]>([])
  let touched = $state(false)

  const all = $derived([...folders, ...shown.filter((f) => !folders.some((x) => x.id === f.id))])
  const error = $derived(validateDesktopName(name, existingNames))
  const items = $derived(all.map((f) => ({ value: f.id, label: `${f.name}   ${f.path}`, testid: 'new-desktop-project' })))

  async function browse(): Promise<void> {
    const picked = await onbrowse?.()
    if (!picked) return
    shown = [...shown, picked]
    if (!checked.includes(picked.id)) checked = [...checked, picked.id]
  }

  function result(r: DialogResult): void {
    if (r === 'cancel') return oncancel?.()
    touched = true
    if (error) return
    oncreate?.({ title: name.trim(), folderIds: $state.snapshot(checked), agentId: agentId ? Number(agentId) : undefined })
  }
</script>

<Dialog testid="new-desktop-dialog" title="New desktop" iconName="computer" width="440px" contained onclose={oncancel}>
  <div class="form">
    <div class="field">
      <Label text="Desktop name:" for="nd-name" />
      <TextBox id="nd-name" data-testid="new-desktop-name" bind:value={name} data-autofocus onfocus={(e) => (e.currentTarget as HTMLInputElement).select()} />
      <span class="error" data-testid="new-desktop-error" role="alert">{touched && error ? error : ''}</span>
    </div>
    <div class="field">
      <Label text="Projects to plug in as USB drives:" />
      <div class="projects">
        <CheckedListBox testid="new-desktop-projects" {items} bind:checked width="100%" height={112} label="Projects" />
        <Button data-testid="new-desktop-browse" onclick={() => void browse()}>Browse...</Button>
      </div>
    </div>
    <div class="field inline">
      <Label text="Agent:" for="nd-agent" />
      <ComboBox items={agents.map((a) => ({ value: String(a.id), label: a.name }))} bind:value={agentId} dropDownStyle="DropDownList" aria-label="Agent" testid="new-desktop-agent" />
    </div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={[{ result: 'ok', label: 'Create' }, 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .field.inline {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .projects {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .projects :global(.w7-checkedlist),
  .projects > :global(*:first-child) {
    flex: 1;
    min-width: 0;
  }
  .error {
    min-height: 15px;
    color: #a01408;
  }
</style>
