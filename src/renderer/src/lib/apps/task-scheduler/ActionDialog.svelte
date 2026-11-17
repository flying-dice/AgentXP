<script lang="ts">
  /** New Action / Edit Action: "Run an agent". */
  import type { AgentDto, SessionDto } from '@shared/models'
  import { actionProblem, newAgentAction, type AgentActionDto } from '@shared/scheduler'
  import type { DriveDto } from '@shared/vfs'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ActionFields from './ActionFields.svelte'
  import { defaultProject } from './taskModel'

  interface Props {
    /** The action to edit; null starts a new one. */
    initial: AgentActionDto | null
    agents: readonly AgentDto[]
    drives: readonly DriveDto[]
    sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]
    onsave: (action: AgentActionDto) => void
    oncancel: () => void
  }

  let { initial, agents, drives, sessions, onsave, oncancel }: Props = $props()

  // svelte-ignore state_referenced_locally
  let draft = $state<AgentActionDto>(initial ? structuredClone($state.snapshot(initial)) : newAgentAction(defaultProject(drives)))
  let problem = $state('')

  function result(r: DialogResult): void {
    if (r !== 'ok') return oncancel()
    const text = actionProblem(draft)
    if (text) problem = text
    else onsave($state.snapshot(draft) as AgentActionDto)
  }
</script>

<Dialog testid="action-dialog" title={initial ? 'Edit Action' : 'New Action'} iconName="session" width="520px" contained onclose={oncancel}>
  <div class="form">
    <p class="kind">Action: <strong>Run an agent</strong></p>
    <ActionFields bind:action={draft} {agents} {drives} {sessions} prefix="action-dialog" />
    <div class="problem" role="alert" data-testid="action-dialog-problem">{problem}</div>
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
  .kind {
    margin: 0;
  }
  .problem {
    min-height: 16px;
    color: #a00000;
  }
</style>
