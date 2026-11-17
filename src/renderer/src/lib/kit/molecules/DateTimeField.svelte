<script lang="ts">
  import DateTimePicker from '../atoms/DateTimePicker.svelte'
  import TimeUpDown from '../atoms/TimeUpDown.svelte'
  import { joinLocal, splitLocal } from './DateTimeField'

  interface Props {
    /** Wall-clock date and time, `YYYY-MM-DDTHH:mm`. */
    value?: string
    disabled?: boolean
    class?: string
    /** `data-testid` prefix: `<testid>-date`, `<testid>-date-open` and `<testid>-time`. */
    testid?: string
    label?: string
    onchange?: (value: string) => void
  }

  let { value = $bindable(''), disabled = false, class: className = '', testid, label = 'Date and time', onchange }: Props = $props()

  const parts = $derived(splitLocal(value) ?? { date: new Date(), minutes: 0 })
  let date = $state(new Date())
  let minutes = $state(0)
  $effect(() => {
    date = parts.date
    minutes = parts.minutes
  })

  function update(): void {
    const next = joinLocal(date, minutes)
    if (next === value) return
    value = next
    onchange?.(next)
  }
</script>

<span class="xp-datetimefield {className}" role="group" aria-label={label}>
  <DateTimePicker bind:value={date} format="Short" width={104} {disabled} label="{label}, date" testid={testid ? `${testid}-date` : undefined} onchange={update} />
  <TimeUpDown bind:value={minutes} {disabled} aria-label="{label}, time" testid={testid ? `${testid}-time` : undefined} onchange={update} />
</span>

<style>
  .xp-datetimefield {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
</style>
