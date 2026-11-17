<script lang="ts">
  /** The fields of one trigger, by kind: used by the Create Basic Task wizard (Trigger Details) and by the trigger dialog. */
  import { DAY_NAMES, MONTH_NAMES, type DayOfWeek, type TriggerDto } from '@shared/schedule'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import NumericUpDown from '../../kit/atoms/NumericUpDown.svelte'
  import GroupBox from '../../kit/atoms/GroupBox.svelte'
  import DateTimeField from '../../kit/molecules/DateTimeField.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import { defaultStart } from './taskModel'

  interface Props {
    trigger: TriggerDto
    /** `data-testid` prefix of the fields. */
    prefix: string
    /** Also show "Stop the trigger at" and "Enabled". */
    advanced?: boolean
  }

  let { trigger = $bindable(), prefix, advanced = false }: Props = $props()

  const toggle = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const dayOfWeek = (d: number): DayOfWeek => d as DayOfWeek
</script>

<div class="fields" data-testid="{prefix}-fields" data-kind={trigger.kind}>
  {#if trigger.kind === 'startup'}
    <LabeledField label="Delay for:" for="{prefix}-delay" labelWidth={110}>
      <NumericUpDown testid="{prefix}-delay" aria-label="Delay in minutes" bind:value={trigger.delayMinutes} min={0} max={1440} style="width:70px" />
      <span>minutes after AgentXP starts</span>
    </LabeledField>
  {:else}
    <LabeledField label="Start:" labelWidth={110}>
      <DateTimeField testid="{prefix}-start" label="Start" bind:value={trigger.startAt} />
    </LabeledField>

    {#if trigger.kind === 'daily'}
      <LabeledField label="Recur every:" for="{prefix}-every" labelWidth={110}>
        <NumericUpDown testid="{prefix}-every" aria-label="Days between runs" bind:value={trigger.everyDays} min={1} max={365} style="width:70px" />
        <span>{trigger.everyDays === 1 ? 'day' : 'days'}</span>
      </LabeledField>
    {:else if trigger.kind === 'weekly'}
      <LabeledField label="Recur every:" for="{prefix}-every" labelWidth={110}>
        <NumericUpDown testid="{prefix}-every" aria-label="Weeks between runs" bind:value={trigger.everyWeeks} min={1} max={52} style="width:70px" />
        <span>{trigger.everyWeeks === 1 ? 'week on:' : 'weeks on:'}</span>
      </LabeledField>
      <div class="grid week" role="group" aria-label="Days of the week">
        {#each DAY_NAMES as name, d (name)}
          <CheckBox testid="{prefix}-dow-{d}" label={name} checked={trigger.daysOfWeek.includes(dayOfWeek(d))} onchange={() => trigger.kind === 'weekly' && (trigger.daysOfWeek = toggle(trigger.daysOfWeek, dayOfWeek(d)))} />
        {/each}
      </div>
    {:else if trigger.kind === 'monthly'}
      <GroupBox text="Months">
        <div class="grid months" role="group" aria-label="Months">
          {#each months as m (m)}
            <CheckBox testid="{prefix}-month-{m}" label={MONTH_NAMES[m - 1]} checked={trigger.months.includes(m)} onchange={() => trigger.kind === 'monthly' && (trigger.months = toggle(trigger.months, m))} />
          {/each}
        </div>
      </GroupBox>
      <GroupBox text="Days">
        <div class="grid dom" role="group" aria-label="Days of the month">
          {#each days as d (d)}
            <CheckBox testid="{prefix}-day-{d}" label={String(d)} checked={trigger.daysOfMonth.includes(d)} onchange={() => trigger.kind === 'monthly' && (trigger.daysOfMonth = toggle(trigger.daysOfMonth, d))} />
          {/each}
          <CheckBox testid="{prefix}-last-day" label="Last" bind:checked={trigger.lastDay} class="last" />
        </div>
        <p class="hint">A month without the day you chose is skipped. Use Last to run on the last day of each month.</p>
      </GroupBox>
    {/if}

    {#if advanced}
      <div class="advanced">
        <CheckBox testid="{prefix}-expire" label="Expire:" checked={trigger.expiresAt !== null} onchange={(on) => (trigger.expiresAt = on ? defaultStart(Date.parse(trigger.startAt) || Date.now()) : null)} />
        {#if trigger.expiresAt !== null}
          <DateTimeField testid="{prefix}-expires" label="Expire" bind:value={trigger.expiresAt} />
        {/if}
      </div>
    {/if}
  {/if}
  {#if advanced}
    <CheckBox testid="{prefix}-enabled" label="Enabled" bind:checked={trigger.enabled} />
  {/if}
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .grid {
    display: grid;
    gap: 3px 10px;
  }
  .week {
    grid-template-columns: repeat(4, max-content);
    padding-left: 116px;
  }
  .months {
    grid-template-columns: repeat(4, 1fr);
  }
  .dom {
    grid-template-columns: repeat(8, 1fr);
  }
  .hint {
    margin: 6px 0 0;
    color: var(--xp-text-muted);
  }
  .advanced {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 23px;
  }
</style>
