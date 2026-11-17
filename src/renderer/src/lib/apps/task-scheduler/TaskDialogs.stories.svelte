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
  import { INHERIT_CAPABILITIES, newAgentAction } from '@shared/scheduler'
  import { sampleMcpServers, sampleProfiles, sampleSkills, sampleTeams } from '../../app/fakeTeams'
  import CapabilitiesFields from './CapabilitiesFields.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Task Scheduler/Dialogs',
    parameters: { layout: 'fullscreen' }
  })

  const drives = [
    { letter: 'C', kind: 'system', label: 'Local Disk', folderId: null, path: '' },
    { letter: 'E', kind: 'removable', label: 'claude-code-win', folderId: 1, path: 'C:\\Users\\jonathan\\source\\claude-code-win' }
  ] as unknown as DriveDto[]
  const sessions = sampleSessions
  const choices = { skills: sampleSkills, servers: sampleMcpServers, profiles: sampleProfiles, teams: sampleTeams }
  const noop = (): void => {}
</script>

<script lang="ts">
  let editor = $state<ScheduledTaskInput>(structuredClone(sampleTaskInputs[1]))
  let editorTab = $state('general')
  let trigger = $state<TriggerDto>(newTrigger('monthly', '2026-11-17T09:00'))
  let weekly = $state<TriggerDto>(newTrigger('weekly', '2026-11-17T09:00'))
  let action = $state(newAgentAction('E:\\'))
  let inherit = $state({ ...INHERIT_CAPABILITIES })
  let profile = $state({ ...INHERIT_CAPABILITIES, mode: 'profile' as const, profileId: sampleProfiles[0].id })
  let team = $state({ ...INHERIT_CAPABILITIES, mode: 'team' as const, teamId: sampleTeams[0].id })
  let custom = $state({ ...INHERIT_CAPABILITIES, mode: 'custom' as const, skills: [{ id: sampleSkills[0].id, name: sampleSkills[0].name }, { id: 99, name: 'old-skill' }], servers: [{ id: sampleMcpServers[0].id, name: sampleMcpServers[0].name }], hiddenTools: [] })
  let conditions = $state(structuredClone(sampleTaskInputs[1].conditions))
  let settings = $state(structuredClone(sampleTaskInputs[1].settings))
</script>

<Story name="CreateBasicTaskWizard" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--xp-face);border:1px solid #999">
    <BasicTaskWizard agents={sampleAgents} {drives} {sessions} {choices} onfinish={async () => null} oncancel={noop} />
  </div>
</Story>

<Story name="CreateTaskProperties" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--xp-face);border:1px solid #999">
    <TaskEditorDialog bind:draft={editor} bind:tab={editorTab} existing agents={sampleAgents} {drives} {sessions} problem="" onedittrigger={noop} oneditaction={noop} onresult={noop} />
  </div>
</Story>

<Story name="TriggersTab" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--xp-face);border:1px solid #999">
    <TaskEditorDialog bind:draft={editor} tab="triggers" existing agents={sampleAgents} {drives} {sessions} problem="" onedittrigger={noop} oneditaction={noop} onresult={noop} />
  </div>
</Story>

<Story name="NewTrigger" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--xp-face);border:1px solid #999">
    <TriggerDialog initial={null} onsave={noop} oncancel={noop} />
  </div>
</Story>

<Story name="NewAction" asChild>
  <div style="position:relative;width:900px;height:640px;background:var(--xp-face);border:1px solid #999">
    <ActionDialog initial={null} agents={sampleAgents} {drives} {sessions} {choices} onsave={noop} oncancel={noop} />
  </div>
</Story>

<Story name="MonthlyTriggerFields" asChild>
  <div style="width:520px;padding:12px;background:var(--xp-face)"><TriggerFields bind:trigger prefix="story" advanced /></div>
</Story>

<Story name="WeeklyTriggerFields" asChild>
  <div style="width:520px;padding:12px;background:var(--xp-face)"><TriggerFields bind:trigger={weekly} prefix="story" /></div>
</Story>

<Story name="ActionFields" asChild>
  <div style="width:520px;padding:12px;background:var(--xp-face)"><ActionFields bind:action agents={sampleAgents} {drives} {sessions} prefix="story" /></div>
</Story>

<Story name="ConditionsAndSettings" asChild>
  <div style="width:560px;display:flex;flex-direction:column;gap:8px;background:var(--xp-face)">
    <ConditionsForm bind:conditions prefix="story" />
    <SettingsForm bind:settings prefix="story" />
  </div>
</Story>

<Story name="SkillsAndToolsEverything" asChild>
  <div style="width:560px;padding:12px;background:var(--xp-face)">
    <CapabilitiesFields bind:capabilities={inherit} existingChat={false} {choices} prefix="story-inherit" />
  </div>
</Story>

<Story name="SkillsAndToolsProfile" asChild>
  <div style="width:560px;padding:12px;background:var(--xp-face)">
    <CapabilitiesFields bind:capabilities={profile} existingChat={false} {choices} prefix="story-profile" />
  </div>
</Story>

<Story name="SkillsAndToolsTeam" asChild>
  <div style="width:560px;padding:12px;background:var(--xp-face)">
    <CapabilitiesFields bind:capabilities={team} existingChat={false} {choices} prefix="story-team" />
  </div>
</Story>

<Story name="SkillsAndToolsCustom" asChild>
  <div style="width:560px;padding:12px;background:var(--xp-face)">
    <CapabilitiesFields bind:capabilities={custom} existingChat={false} {choices} prefix="story-custom" />
  </div>
</Story>

<Story name="SkillsAndToolsExistingChat" asChild>
  <div style="width:560px;padding:12px;background:var(--xp-face)">
    <CapabilitiesFields bind:capabilities={inherit} existingChat {choices} prefix="story-existing" />
  </div>
</Story>
