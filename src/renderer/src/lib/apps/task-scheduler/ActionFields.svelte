<script lang="ts">
  /** The fields of the action "Run an agent": agent, project, new or existing chat and the prompt. */
  import type { AgentDto, SessionDto } from '@shared/models'
  import type { AgentActionDto } from '@shared/scheduler'
  import type { DriveDto } from '@shared/vfs'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import RadioButton from '../../kit/atoms/RadioButton.svelte'
  import RadioButtonGroup from '../../kit/atoms/RadioButtonGroup.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import CapabilitiesFields from './CapabilitiesFields.svelte'
  import { agentChoices, agentFromValue, agentValue, chatChoices, NO_CHOICES, projectChoices, type CapabilityChoices } from './taskModel'

  interface Props {
    action: AgentActionDto
    agents: readonly AgentDto[]
    drives: readonly DriveDto[]
    sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]
    /** The skills, servers, profiles and teams a run may use. */
    choices?: CapabilityChoices
    /** `data-testid` prefix of the fields. */
    prefix: string
  }

  let { action = $bindable(), agents, drives, sessions, choices = NO_CHOICES, prefix }: Props = $props()

  const agentItems = $derived(agentChoices(agents))
  const projectItems = $derived(projectChoices(drives, action.cwd))
  const chats = $derived(chatChoices(sessions))
  // A chat that no longer exists stays in the list under a plain name, so the task still shows what it was set to.
  const chatItems = $derived(action.sessionId !== null && !chats.some((c) => c.value === String(action.sessionId)) ? [...chats, { value: String(action.sessionId), label: 'A chat that was removed' }] : chats)
</script>

<div class="fields" data-testid="{prefix}-fields">
  <LabeledField label="Agent:" for="{prefix}-agent" labelWidth={90}>
    <ComboBox testid="{prefix}-agent" aria-label="Agent" items={agentItems} value={agentValue(action.agentId)} onchange={(v) => (action.agentId = agentFromValue(v))} />
  </LabeledField>
  <LabeledField label="Project:" for="{prefix}-project" labelWidth={90}>
    <ComboBox testid="{prefix}-project" aria-label="Project" items={projectItems} value={action.cwd} onchange={(v) => (action.cwd = v)} />
  </LabeledField>
  <LabeledField label="Chat:" labelWidth={90} class="top">
    <div class="chat">
      <RadioButtonGroup aria-label="Chat" value={action.session} onchange={(v) => (action.session = v === 'existing' ? 'existing' : 'new')}>
        <RadioButton testid="{prefix}-session-new" value="new" label="Start a new chat for every run" />
        <RadioButton testid="{prefix}-session-existing" value="existing" label="Send the prompt to this chat" disabled={chats.length === 0 && action.sessionId === null} />
      </RadioButtonGroup>
      {#if action.session === 'existing'}
        <ComboBox testid="{prefix}-chat" aria-label="Chat that gets the prompt" items={chatItems} value={action.sessionId === null ? '' : String(action.sessionId)} placeholder="Choose a chat" onchange={(v) => (action.sessionId = v === '' ? null : Number(v))} />
      {/if}
    </div>
  </LabeledField>
  <CapabilitiesFields bind:capabilities={action.capabilities} existingChat={action.session === 'existing'} {choices} {prefix} />
  <LabeledField label="Prompt:" for="{prefix}-prompt" labelWidth={90} class="top">
    <TextBox id="{prefix}-prompt" data-testid="{prefix}-prompt" multiline rows={6} bind:value={action.prompt} placeholder="What the agent should do, for example: Review the changes of yesterday and write a summary." />
  </LabeledField>
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fields :global(.top) {
    align-items: flex-start;
  }
  .chat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
</style>
