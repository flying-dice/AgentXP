<script lang="ts">
  /** The settings of a task: Run on demand, missed starts, run time, restart after a failure, and what to do when it runs already. */
  import { IF_RUNNING_LABEL, type IfRunning, type TaskSettingsDto } from '@shared/scheduler'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import NumericUpDown from '../../kit/atoms/NumericUpDown.svelte'

  interface Props {
    settings: TaskSettingsDto
    prefix: string
  }

  let { settings = $bindable(), prefix }: Props = $props()

  const ifRunning = (Object.keys(IF_RUNNING_LABEL) as IfRunning[]).map((k) => ({ value: k, label: IF_RUNNING_LABEL[k] }))
</script>

<div class="form" data-testid="{prefix}-settings">
  <p>Specify additional settings that affect the behavior of the task.</p>
  <CheckBox testid="{prefix}-set-on-demand" bind:checked={settings.allowOnDemand} label="Allow the task to be run on demand" />
  <CheckBox testid="{prefix}-set-missed" bind:checked={settings.runMissed} label="Run the task as soon as possible after a scheduled start is missed (Agent7 was closed)" />
  <div class="row">
    <CheckBox testid="{prefix}-set-restart" bind:checked={settings.restartOnFailure} label="If the task fails, restart every:" />
    <NumericUpDown testid="{prefix}-set-restart-interval" aria-label="Minutes between restarts" bind:value={settings.restartIntervalMinutes} min={1} max={1440} disabled={!settings.restartOnFailure} style="width:70px" />
    <span class:off={!settings.restartOnFailure}>minutes, at most</span>
    <NumericUpDown testid="{prefix}-set-restart-attempts" aria-label="Number of restarts" bind:value={settings.restartAttempts} min={1} max={99} disabled={!settings.restartOnFailure} style="width:60px" />
    <span class:off={!settings.restartOnFailure}>times</span>
  </div>
  <div class="row">
    <CheckBox testid="{prefix}-set-stop" bind:checked={settings.stopIfRunsLonger} label="Stop the task if it runs longer than:" />
    <NumericUpDown testid="{prefix}-set-stop-minutes" aria-label="Minutes before the task is stopped" bind:value={settings.stopAfterMinutes} min={1} max={10080} disabled={!settings.stopIfRunsLonger} style="width:80px" />
    <span class:off={!settings.stopIfRunsLonger}>minutes</span>
  </div>
  <div class="row">
    <span>If the task is already running, then the following rule applies:</span>
  </div>
  <div class="row indent">
    <ComboBox testid="{prefix}-set-if-running" aria-label="If the task is already running" items={ifRunning} value={settings.ifRunning} onchange={(v) => (settings.ifRunning = v as IfRunning)} style="width:260px" />
  </div>
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
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .indent {
    padding-left: 18px;
  }
  .off {
    color: var(--w7-text-disabled);
  }
</style>
