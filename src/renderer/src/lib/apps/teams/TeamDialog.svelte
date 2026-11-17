<script lang="ts">
  /** Add or edit a team: its members, the instructions and skills every member gets, and the board it works from. */
  import type { BoardDto } from '@shared/kanban'
  import type { ProfileDto, SkillDto, TeamInput } from '@shared/teams'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import CheckedListBox from '../../kit/atoms/CheckedListBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import { emptyTeamForm, teamInputFromForm, validateTeamForm, type TeamFormValues } from './teamForms'

  interface Props {
    title?: string
    initial?: TeamFormValues
    profiles: readonly ProfileDto[]
    skills: readonly SkillDto[]
    /** The Kanban boards of the desktop the team can work from. */
    boards?: readonly BoardDto[]
    onsubmit?: (input: TeamInput) => void
    onclose?: () => void
    contained?: boolean
  }

  let { title = 'New Team', initial = emptyTeamForm(), profiles, skills, boards = [], onsubmit, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<TeamFormValues>({ ...initial, memberIds: [...initial.memberIds], skillIds: [...initial.skillIds] })
  let touched = $state(false)
  const problem = $derived(validateTeamForm(form))
  const memberItems = $derived(profiles.map((p) => ({ value: p.id, label: p.name, testid: 'team-dialog-member' })))
  const boardItems = $derived([{ value: '', label: '(none)' }, ...boards.map((b) => ({ value: String(b.id), label: b.name }))])
  const skillItems = $derived(skills.map((s) => ({ value: s.id, label: s.name, title: s.description })))

  function result(r: DialogResult): void {
    if (r === 'ok') {
      touched = true
      if (problem) return
      onsubmit?.(teamInputFromForm(form))
    }
    onclose?.()
  }
</script>

<Dialog testid="team-dialog" {title} iconName="user" width="520px" {contained} {onclose}>
  <div class="form">
    <LabeledField label="Name:" for="team-name" labelWidth={90}>
      <TextBox id="team-name" data-testid="team-dialog-name" bind:value={form.name} placeholder="For example: Feature team" />
    </LabeledField>
    <LabeledField label="Instructions:" for="team-instructions" labelWidth={90}>
      <TextBox id="team-instructions" data-testid="team-dialog-instructions" multiline rows={4} bind:value={form.instructions} placeholder="What every member is told, before its own instructions." />
    </LabeledField>
    <LabeledField label="Members:" labelWidth={90}>
      <CheckedListBox testid="team-dialog-members" items={memberItems} bind:checked={form.memberIds} width="100%" height={86} label="Members of the team" />
    </LabeledField>
    <div class="hint">The first member answers a message that has no @mention.</div>
    <LabeledField label="Skills:" labelWidth={90}>
      <CheckedListBox testid="team-dialog-skills" items={skillItems} bind:checked={form.skillIds} width="100%" height={70} label="Skills every member gets" />
    </LabeledField>
    <LabeledField label="Board:" labelWidth={90}>
      <ComboBox testid="team-dialog-board" items={boardItems} bind:value={form.boardRef} aria-label="Kanban board of the team" />
    </LabeledField>
    <div class="problem" role="alert" data-testid="team-dialog-problem">{touched && problem ? problem : ''}</div>
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
  .hint {
    padding-left: 98px;
    color: #555;
  }
  .problem {
    min-height: 16px;
    padding-left: 98px;
    color: #a00000;
  }
</style>
