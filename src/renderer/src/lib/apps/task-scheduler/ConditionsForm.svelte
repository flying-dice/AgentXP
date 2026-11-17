<script lang="ts">
  /** The conditions of a task: it starts only when they hold. */
  import type { TaskConditionsDto } from '@shared/scheduler'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'

  interface Props {
    conditions: TaskConditionsDto
    prefix: string
  }

  let { conditions = $bindable(), prefix }: Props = $props()
</script>

<div class="form" data-testid="{prefix}-conditions">
  <p>Specify the conditions that must be met for the task to start. If a condition does not hold when the task is due, the run is skipped and the History tab says why. Run on demand ignores the conditions.</p>
  <GroupBox text="Desktop">
    <div class="list">
      <CheckBox testid="{prefix}-cond-not-paused" bind:checked={conditions.onlyIfNotPaused} label="Start the task only if the desktop is not paused" />
    </div>
  </GroupBox>
  <GroupBox text="Agents and tasks">
    <div class="list">
      <CheckBox testid="{prefix}-cond-idle" bind:checked={conditions.onlyIfAgentIdle} label="Start the task only if no chat of this desktop is working or waiting for an answer" />
      <CheckBox testid="{prefix}-cond-no-other" bind:checked={conditions.onlyIfNoOtherTaskRuns} label="Start the task only if no other task of this desktop runs" />
    </div>
  </GroupBox>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }
  p {
    margin: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
