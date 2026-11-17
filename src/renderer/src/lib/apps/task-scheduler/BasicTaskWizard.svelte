<script lang="ts">
  /** Create Basic Task: name, trigger, trigger details, action and summary, one step at a time. */
  import { TRIGGER_KIND_LABEL, type TriggerKind } from '@shared/schedule'
  import type { AgentDto, SessionDto } from '@shared/models'
  import type { ScheduledTaskInput } from '@shared/scheduler'
  import type { DriveDto } from '@shared/vfs'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import RadioButton from '../../kit/atoms/RadioButton.svelte'
  import RadioButtonGroup from '../../kit/atoms/RadioButtonGroup.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import WizardHeader from '../../kit/molecules/WizardHeader.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ActionFields from './ActionFields.svelte'
  import TriggerFields from './TriggerFields.svelte'
  import {
    defaultProject,
    firstWizardProblem,
    newWizardDraft,
    withTriggerKind,
    wizardInput,
    wizardProblem,
    wizardSummary,
    WIZARD_DESCRIPTION,
    WIZARD_STEPS,
    WIZARD_TITLE,
    WIZARD_TRIGGERS,
    type WizardStep
  } from './taskModel'

  interface Props {
    agents: readonly AgentDto[]
    drives: readonly DriveDto[]
    sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]
    /** Saves the task. Resolves null when it is saved, or the reason it was not. */
    onfinish: (input: ScheduledTaskInput, openProperties: boolean) => Promise<string | null>
    oncancel: () => void
  }

  let { agents, drives, sessions, onfinish, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let draft = $state(newWizardDraft(defaultProject(drives)))
  let step = $state<WizardStep>('name')
  let problem = $state('')
  let saving = $state(false)

  const index = $derived(WIZARD_STEPS.indexOf(step))
  const last = $derived(step === 'finish')
  const summary = $derived(wizardSummary(draft, { agents, drives, sessions }))

  function next(): void {
    const text = wizardProblem(step, draft)
    problem = text ?? ''
    if (!text) step = WIZARD_STEPS[index + 1]
  }
  function back(): void {
    problem = ''
    step = WIZARD_STEPS[Math.max(0, index - 1)]
  }

  async function finish(): Promise<void> {
    const wrong = firstWizardProblem(draft)
    if (wrong) {
      step = wrong.step
      problem = wrong.text
      return
    }
    saving = true
    try {
      const error = await onfinish(wizardInput($state.snapshot(draft)), draft.openProperties)
      if (error) problem = error
    } finally {
      saving = false
    }
  }

  function setKind(kind: string): void {
    draft = withTriggerKind(draft, kind as TriggerKind)
  }

  /** Enter goes to the next step; Esc is handled by the dialog. */
  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.defaultPrevented) return
    const target = event.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') return
    event.preventDefault()
    if (last) void finish()
    else next()
  }
</script>

<Dialog testid="basic-wizard" title="Create Basic Task Wizard" iconName="scheduler" width="660px" contained onclose={oncancel}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="wizard" data-testid="basic-wizard-body" data-step={step} {onkeydown}>
    <WizardHeader testid="basic-wizard-header" title={WIZARD_TITLE[step]} description={WIZARD_DESCRIPTION[step]} icon="scheduler" />
    <div class="body">
      <div class="page">
        {#if step === 'name'}
          <LabeledField label="Name:" for="basic-wizard-name" labelWidth={90}>
            <TextBox id="basic-wizard-name" data-testid="basic-wizard-name" bind:value={draft.name} maxlength={120} data-autofocus />
          </LabeledField>
          <LabeledField label="Description:" for="basic-wizard-description" labelWidth={90} class="top">
            <TextBox id="basic-wizard-description" data-testid="basic-wizard-description" multiline rows={7} bind:value={draft.description} />
          </LabeledField>
        {:else if step === 'trigger'}
          <p>When do you want the task to start?</p>
          <RadioButtonGroup aria-label="When the task starts" value={draft.trigger.kind} onchange={setKind}>
            {#each WIZARD_TRIGGERS as kind (kind)}
              <RadioButton testid="basic-wizard-kind-{kind}" value={kind} label={TRIGGER_KIND_LABEL[kind]} />
            {/each}
          </RadioButtonGroup>
        {:else if step === 'details'}
          <TriggerFields bind:trigger={draft.trigger} prefix="basic-wizard-trigger" />
        {:else if step === 'action'}
          <ActionFields bind:action={draft.action} {agents} {drives} {sessions} prefix="basic-wizard-action" />
        {:else}
          <dl class="summary" data-testid="basic-wizard-summary">
            {#each summary as [k, v] (k)}
              <dt>{k}:</dt>
              <dd>{v}</dd>
            {/each}
          </dl>
          <CheckBox testid="basic-wizard-open-properties" bind:checked={draft.openProperties} label="Open the Properties dialog for this task when I click Finish" />
        {/if}
        <div class="problem" role="alert" data-testid="basic-wizard-problem">{problem}</div>
      </div>
    </div>
  </div>
  {#snippet buttons()}
    <div class="bar">
      <span class="stepno" data-testid="basic-wizard-step-number">Step {index + 1} of {WIZARD_STEPS.length}: {WIZARD_TITLE[step]}</span>
      <Button data-testid="basic-wizard-back" disabled={index === 0 || saving} onclick={back}>&lt; Back</Button>
      {#if last}
        <Button data-testid="basic-wizard-finish" isDefault disabled={saving} onclick={() => void finish()}>Finish</Button>
      {:else}
        <Button data-testid="basic-wizard-next" isDefault onclick={next}>Next &gt;</Button>
      {/if}
      <Button data-testid="basic-wizard-cancel" onclick={oncancel}>Cancel</Button>
    </div>
  {/snippet}
</Dialog>

<style>
  .wizard {
    display: flex;
    flex-direction: column;
    height: 380px;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 0;
  }
  .page {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    overflow: auto;
    background: var(--w7-face);
    border-bottom: 1px solid var(--w7-group-border);
  }
  .page :global(.top) {
    align-items: flex-start;
  }
  .page p {
    margin: 0;
  }
  .summary {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 4px 8px;
    margin: 0 0 8px;
  }
  dt {
    color: var(--w7-text-muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .problem {
    min-height: 16px;
    color: #a00000;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .stepno {
    flex: 1;
    color: var(--w7-text-muted);
  }
</style>
