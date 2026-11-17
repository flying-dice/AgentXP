<script lang="ts">
  /** Add or edit a profile: a member of a team with instructions, an agent and model, and its own skills and tools. */
  import type { AgentDto } from '@shared/models'
  import type { McpServerDto, ProfileInput, SkillDto } from '@shared/teams'
  import CheckedListBox from '../../kit/atoms/CheckedListBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import { emptyProfileForm, profileInputFromForm, validateProfileForm, type ProfileFormValues } from './teamForms'

  interface Props {
    title?: string
    initial?: ProfileFormValues
    agents: readonly AgentDto[]
    skills: readonly SkillDto[]
    servers: readonly McpServerDto[]
    onsubmit?: (input: ProfileInput) => void
    onclose?: () => void
    contained?: boolean
  }

  let { title = 'New Profile', initial = emptyProfileForm(), agents, skills, servers, onsubmit, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<ProfileFormValues>({ ...initial, skillIds: [...initial.skillIds], mcpServerIds: [...initial.mcpServerIds] })
  let touched = $state(false)
  const problem = $derived(validateProfileForm(form))
  const agentItems = $derived([{ value: '', label: 'Default agent' }, ...agents.map((a) => ({ value: String(a.id), label: a.name }))])
  const skillItems = $derived(skills.map((s) => ({ value: s.id, label: s.name, title: s.description })))
  const serverItems = $derived(servers.map((s) => ({ value: s.id, label: s.name })))

  function result(r: DialogResult): void {
    if (r === 'ok') {
      touched = true
      if (problem) return
      onsubmit?.(profileInputFromForm(form))
    }
    onclose?.()
  }
</script>

<Dialog testid="profile-dialog" {title} iconName="agent" width="520px" {contained} {onclose}>
  <div class="form">
    <LabeledField label="Name:" for="profile-name" labelWidth={90}>
      <TextBox id="profile-name" data-testid="profile-dialog-name" bind:value={form.name} placeholder="What teammates call this member, for example: Reviewer" />
    </LabeledField>
    <LabeledField label="Instructions:" for="profile-instructions" labelWidth={90}>
      <TextBox id="profile-instructions" data-testid="profile-dialog-instructions" multiline rows={6} bind:value={form.instructions} placeholder="The role and how this member works. Say who it should call with @name." />
    </LabeledField>
    <LabeledField label="Agent:" labelWidth={90}>
      <ComboBox testid="profile-dialog-agent" items={agentItems} dropDownStyle="DropDownList" bind:value={form.agentId} aria-label="Agent" />
    </LabeledField>
    <LabeledField label="Model:" for="profile-model" labelWidth={90}>
      <TextBox id="profile-model" data-testid="profile-dialog-model" bind:value={form.model} placeholder="Optional. A model the agent offers; empty keeps its own." />
    </LabeledField>
    <div class="two">
      <LabeledField label="Skills:" labelWidth={90}>
        <CheckedListBox testid="profile-dialog-skills" items={skillItems} bind:checked={form.skillIds} width="100%" height={86} label="Skills of this member" />
      </LabeledField>
      <LabeledField label="MCP servers:" labelWidth={90}>
        <CheckedListBox testid="profile-dialog-servers" items={serverItems} bind:checked={form.mcpServerIds} width="100%" height={86} label="MCP servers of this member" />
      </LabeledField>
    </div>
    <div class="problem" role="alert" data-testid="profile-dialog-problem">{touched && problem ? problem : ''}</div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .form :global(.field) {
    align-items: flex-start;
  }
  .two {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .problem {
    min-height: 16px;
    padding-left: 98px;
    color: #a00000;
  }
</style>
