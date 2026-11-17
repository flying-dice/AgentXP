<script lang="ts">
  /** Create Task and Properties: the five tabs of a task. Editing a trigger or an action opens a dialog of the window (`onedittrigger`, `oneditaction`). */
  import type { AgentDto, SessionDto } from '@shared/models'
  import type { ScheduledTaskInput } from '@shared/scheduler'
  import type { DriveDto } from '@shared/vfs'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn } from '../../kit/organisms/ListView'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import ConditionsForm from './ConditionsForm.svelte'
  import SettingsForm from './SettingsForm.svelte'
  import { actionRow, NO_CHOICES, triggerRow, type ActionContext, type CapabilityChoices } from './taskModel'

  interface Props {
    /** The task being edited; the window keeps it, so the dialogs for a trigger and an action can change it. */
    draft: ScheduledTaskInput
    /** Properties of a task that exists (true) or Create Task (false). */
    existing: boolean
    agents: readonly AgentDto[]
    drives: readonly DriveDto[]
    sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]
    choices?: CapabilityChoices
    /** Why the task was not saved: a problem of the input or the answer of main. */
    problem: string
    tab: string
    onedittrigger: (index: number | null) => void
    oneditaction: (index: number | null) => void
    onresult: (result: 'ok' | 'cancel') => void
  }

  let { draft = $bindable(), existing, agents, drives, sessions, choices = NO_CHOICES, problem, tab = $bindable('general'), onedittrigger, oneditaction, onresult }: Props = $props()

  const tabs = [
    { id: 'general', title: 'General', testid: 'task-editor-tab-general' },
    { id: 'triggers', title: 'Triggers', testid: 'task-editor-tab-triggers' },
    { id: 'actions', title: 'Actions', testid: 'task-editor-tab-actions' },
    { id: 'conditions', title: 'Conditions', testid: 'task-editor-tab-conditions' },
    { id: 'settings', title: 'Settings', testid: 'task-editor-tab-settings' }
  ]

  const ctx = $derived<ActionContext>({ agents, drives, sessions, profiles: choices.profiles, teams: choices.teams })
  const triggerColumns: ListColumn[] = [
    { key: 'kind', header: 'Trigger', width: 110 },
    { key: 'details', header: 'Details', minWidth: 160 },
    { key: 'status', header: 'Status', width: 70 }
  ]
  const actionColumns: ListColumn[] = [
    { key: 'action', header: 'Action', width: 100 },
    { key: 'details', header: 'Details', minWidth: 160 },
    { key: 'tools', header: 'Skills and tools', width: 170 }
  ]
  let triggerSelected = $state<string[]>([])
  let actionSelected = $state<string[]>([])
  const triggerIndex = $derived(triggerSelected.length ? Number(triggerSelected[0]) : -1)
  const actionIndex = $derived(actionSelected.length ? Number(actionSelected[0]) : -1)

  function removeTrigger(): void {
    if (triggerIndex < 0) return
    draft.triggers = draft.triggers.filter((_, i) => i !== triggerIndex)
    triggerSelected = []
  }
  function removeAction(): void {
    if (actionIndex < 0) return
    draft.actions = draft.actions.filter((_, i) => i !== actionIndex)
    actionSelected = []
  }
  const result = (r: DialogResult): void => onresult(r === 'ok' ? 'ok' : 'cancel')
</script>

<Dialog testid="task-editor" title={existing ? 'Task Properties' : 'Create Task'} iconName="scheduler" width="640px" contained onclose={() => onresult('cancel')}>
  <div class="editor">
    <TabControl {tabs} bind:selected={tab} aria-label="Task">
      {#snippet panel(t)}
        <div class="page">
          {#if t.id === 'general'}
            <div class="form">
              <LabeledField label="Name:" for="task-editor-name" labelWidth={90}>
                <TextBox id="task-editor-name" data-testid="task-editor-name" bind:value={draft.name} maxlength={120} />
              </LabeledField>
              <LabeledField label="Description:" for="task-editor-description" labelWidth={90} class="top">
                <TextBox id="task-editor-description" data-testid="task-editor-description" multiline rows={6} bind:value={draft.description} />
              </LabeledField>
              <div class="indent"><CheckBox testid="task-editor-enabled" bind:checked={draft.enabled} label="Enabled (a disabled task does not start by itself)" /></div>
            </div>
          {:else if t.id === 'triggers'}
            <div class="listpage">
              <p>When you create a task, you can specify the conditions that will trigger the task. Without a trigger, the task runs only when you use Run.</p>
              <div class="grid">
                <ListView testid="task-editor-triggers" columns={triggerColumns} rows={draft.triggers.map(triggerRow)} bind:selected={triggerSelected} aria-label="Triggers" emptyText="No triggers yet. Click New… to choose when the task starts. Without a trigger, the task runs only when you use Run." onactivate={(row) => onedittrigger(Number(row.id))} />
              </div>
              <div class="buttons">
                <Button data-testid="task-editor-trigger-new" onclick={() => onedittrigger(null)}>New…</Button>
                <Button data-testid="task-editor-trigger-edit" disabled={triggerIndex < 0} onclick={() => onedittrigger(triggerIndex)}>Edit…</Button>
                <Button data-testid="task-editor-trigger-delete" disabled={triggerIndex < 0} onclick={removeTrigger}>Delete</Button>
              </div>
            </div>
          {:else if t.id === 'actions'}
            <div class="listpage">
              <p>When you create a task, you must specify the action that will occur when your task starts. The agent receives the prompt in a chat.</p>
              <div class="grid">
                <ListView testid="task-editor-actions" columns={actionColumns} rows={draft.actions.map((a, i) => actionRow(a, i, ctx))} bind:selected={actionSelected} aria-label="Actions" emptyText="No actions. Add at least one." onactivate={(row) => oneditaction(Number(row.id))} />
              </div>
              <div class="buttons">
                <Button data-testid="task-editor-action-new" onclick={() => oneditaction(null)}>New…</Button>
                <Button data-testid="task-editor-action-edit" disabled={actionIndex < 0} onclick={() => oneditaction(actionIndex)}>Edit…</Button>
                <Button data-testid="task-editor-action-delete" disabled={actionIndex < 0} onclick={removeAction}>Delete</Button>
              </div>
            </div>
          {:else if t.id === 'conditions'}
            <ConditionsForm bind:conditions={draft.conditions} prefix="task-editor" />
          {:else}
            <SettingsForm bind:settings={draft.settings} prefix="task-editor" />
          {/if}
        </div>
      {/snippet}
    </TabControl>
    <div class="problem" role="alert" data-testid="task-editor-problem">{problem}</div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 2px 0;
  }
  .editor :global(.xp-tabcontrol) {
    height: 340px;
  }
  .page {
    height: 100%;
    overflow: auto;
    box-sizing: border-box;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
  }
  .form :global(.top) {
    align-items: flex-start;
  }
  .indent {
    padding-left: 96px;
  }
  .listpage {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    box-sizing: border-box;
  }
  .listpage p {
    margin: 0;
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .grid :global(.xp-listview) {
    flex: 1;
    min-height: 0;
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .problem {
    min-height: 16px;
    color: #a00000;
  }
</style>
