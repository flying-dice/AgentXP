<script lang="ts">
  /** "New desktop": a name, the project folders the agent can use (plugged in as drives), and the agent. */
  import type { AgentDto, FolderDto, Id } from '@shared/models'
  import type { NewDesktopInput } from '@shared/vfs'
  import Button from '../kit/atoms/Button.svelte'
  import CheckedListBox from '../kit/atoms/CheckedListBox.svelte'
  import ComboBox from '../kit/atoms/ComboBox.svelte'
  import Label from '../kit/atoms/Label.svelte'
  import DialogButtons from '../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../kit/molecules/DialogButtons'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import DesktopNameField from './DesktopNameField.svelte'
  import { validateDesktopName } from './launcherModel'

  interface Props {
    folders: FolderDto[]
    agents: AgentDto[]
    /** Names of the existing desktops (no duplicates). */
    existingNames?: string[]
    /** The Browse... button: shows the Browse For Folder dialog; resolves the new folder, or null when cancelled. */
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

  const all = $derived([...folders, ...shown.filter((f) => !folders.some((x) => x.id === f.id))])
  const error = $derived(validateDesktopName(name, existingNames))
  /** The first project folder the user chose (the name suggestion uses it). */
  const firstProject = $derived(all.find((f) => f.id === checked[0])?.name)
  const items = $derived(all.map((f) => ({ value: f.id, label: `${f.name}   ${f.path}`, testid: 'new-desktop-project' })))

  async function browse(): Promise<void> {
    const picked = await onbrowse?.()
    if (!picked) return
    shown = [...shown, picked]
    if (!checked.includes(picked.id)) checked = [...checked, picked.id]
  }

  function result(r: DialogResult): void {
    if (r === 'cancel') return oncancel?.()
    if (error) return
    oncreate?.({ title: name.trim(), folderIds: $state.snapshot(checked), agentId: agentId ? Number(agentId) : undefined })
  }
</script>

<Dialog testid="new-desktop-dialog" title="New desktop" iconName="computer" width="460px" contained onclose={oncancel}>
  <div class="form">
    <div class="field">
      <DesktopNameField bind:value={name} label="Desktop name:" {existingNames} idPrefix="new-desktop" project={firstProject} />
      <p class="opens" data-testid="new-desktop-opens-note">Agent7 opens the new desktop when you click Create.</p>
    </div>
    <div class="field">
      <Label text="Project folders the agent can use (they appear as drives):" />
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
    <DialogButtons buttons={[{ result: 'ok', label: 'Create', disabled: error !== null }, 'cancel']} onresult={result} />
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
  .opens {
    margin: 0;
    color: var(--w7-text-muted);
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
</style>
