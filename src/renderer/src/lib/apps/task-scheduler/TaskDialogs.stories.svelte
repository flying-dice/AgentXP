<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { sampleAgents, sampleSessions } from '../../app/fakeApi'
  import { sampleTaskInputs } from '../../app/fakeScheduler'
  import type { DriveDto } from '@shared/vfs'
  import type { ScheduledTaskInput } from '@shared/scheduler'
  import BasicTaskWizard from './BasicTaskWizard.svelte'
  import TaskEditorDialog from './TaskEditorDialog.svelte'
  import TriggerDialog from './TriggerDialog.svelte'
  import ActionDialog from './ActionDialog.svelte'
  import TriggerFields from './TriggerFields.svelte'
  import ActionFields from './ActionFields.svelte'
  import ConditionsForm from './ConditionsForm.svelte'
  import SettingsForm from './SettingsForm.svelte'
  import { newTrigger, type TriggerDto } from '@shared/schedule'
  import { newAgentAction } from '@shared/scheduler'

  const { Story } = defineMeta({
    title: 'Apps/Task Scheduler/Dialogs',
    parameters: { layout: 'fullscreen' }
  })

  const drives = [
    { letter: 'C', kind: 'system', label: 'Local Disk', folderId: null, path: '' },
    { letter: 'E', kind: 'removable', label: 'claude-code-win', folderId: 1, path: 'C:\\Users\\jonathan\\source\\claude-code-win' }
  ] as unknown as DriveDto[]
  const sessions = sampleSessions
  const noop = (): void => {}
</script>

<script lang="ts">
  let editor = $state<ScheduledTaskInput>(structuredClone(sampleTaskInputs[1]))
  let editorTab = $state('general')
  let trigger = $state<TriggerDto>(newTrigger('monthly', '2026-11-17T09:00'))
  let weekly = $state<TriggerDto>(newTrigger('weekly', '2026-11-17T09:00'))
  let action = $state(newAgentAction('E:\\'))
  let conditions = $state(structuredClone(sampleTaskInputs[1].conditions))
  let settings = $state(structuredClone(sampleTaskInputs[1].settings))
</script>

<Story name="CreateBasicTaskWizard" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--w7-face);border:1px solid #999">
    <BasicTaskWizard agents={sampleAgents} {drives} {sessions} onfinish={async () => null} oncancel={noop} />
  </div>
</Story>

<Story name="CreateTaskProperties" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--w7-face);border:1px solid #999">
    <TaskEditorDialog bind:draft={editor} bind:tab={editorTab} existing agents={sampleAgents} {drives} {sessions} problem="" onedittrigger={noop} oneditaction={noop} onresult={noop} />
  </div>
</Story>

<Story name="TriggersTab" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--w7-face);border:1px solid #999">
    <TaskEditorDialog bind:draft={editor} tab="triggers" existing agents={sampleAgents} {drives} {sessions} problem="" onedittrigger={noop} oneditaction={noop} onresult={noop} />
  </div>
</Story>

<Story name="NewTrigger" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--w7-face);border:1px solid #999">
    <TriggerDialog initial={null} onsave={noop} oncancel={noop} />
  </div>
</Story>

<Story name="NewAction" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--w7-face);border:1px solid #999">
    <ActionDialog initial={null} agents={sampleAgents} {drives} {sessions} onsave={noop} oncancel={noop} />
  </div>
</Story>

<Story name="MonthlyTriggerFields" asChild>
  <div style="width:520px;padding:12px;background:var(--w7-face)"><TriggerFields bind:trigger prefix="story" advanced /></div>
</Story>

<Story name="WeeklyTriggerFields" asChild>
  <div style="width:520px;padding:12px;background:var(--w7-face)"><TriggerFields bind:trigger={weekly} prefix="story" /></div>
</Story>

<Story name="ActionFields" asChild>
  <div style="width:520px;padding:12px;background:var(--w7-face)"><ActionFields bind:action agents={sampleAgents} {drives} {sessions} prefix="story" /></div>
</Story>

<Story name="ConditionsAndSettings" asChild>
  <div style="width:560px;display:flex;flex-direction:column;gap:8px;background:var(--w7-face)">
    <ConditionsForm bind:conditions prefix="story" />
    <SettingsForm bind:settings prefix="story" />
  </div>
</Story>
