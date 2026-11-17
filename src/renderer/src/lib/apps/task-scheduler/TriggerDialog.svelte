<script lang="ts">
  /** New Trigger / Edit Trigger: the kind of the trigger and its fields. */
  import { newTrigger, TRIGGER_KINDS, TRIGGER_KIND_LABEL, triggerProblem, type TriggerDto, type TriggerKind } from '@shared/schedule'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import TriggerFields from './TriggerFields.svelte'
  import { defaultStart } from './taskModel'

  interface Props {
    /** The trigger to edit; null starts a new one. */
    initial: TriggerDto | null
    onsave: (trigger: TriggerDto) => void
    oncancel: () => void
  }

  let { initial, onsave, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let draft = $state<TriggerDto>(initial ? structuredClone(initial) : newTrigger('daily', defaultStart()))
  let problem = $state('')

  const kinds = TRIGGER_KINDS.map((k) => ({ value: k, label: TRIGGER_KIND_LABEL[k] }))

  function setKind(kind: string): void {
    if (kind === draft.kind) return
    const start = draft.kind === 'startup' ? defaultStart() : draft.startAt
    draft = { ...newTrigger(kind as TriggerKind, start), enabled: draft.enabled }
    problem = ''
  }

  function result(r: DialogResult): void {
    if (r !== 'ok') return oncancel()
    const text = triggerProblem(draft)
    if (text) problem = text
    else onsave($state.snapshot(draft) as TriggerDto)
  }
</script>

<Dialog testid="trigger-dialog" title={initial ? 'Edit Trigger' : 'New Trigger'} iconName="scheduler" width="520px" contained onclose={oncancel}>
  <div class="form">
    <LabeledField label="Begin the task:" for="trigger-dialog-kind" labelWidth={110}>
      <ComboBox testid="trigger-dialog-kind" aria-label="When the task starts" items={kinds} value={draft.kind} onchange={setKind} />
    </LabeledField>
    <TriggerFields bind:trigger={draft} prefix="trigger-dialog" advanced />
    <div class="problem" role="alert" data-testid="trigger-dialog-problem">{problem}</div>
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
    padding: 4px 2px;
  }
  .problem {
    min-height: 16px;
    color: #a00000;
  }
</style>
