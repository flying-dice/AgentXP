<script lang="ts">
  import MonthCalendar from '$lib/kit/atoms/MonthCalendar.svelte'
  import { asBoolean, asString, setterOf } from '../viewProps'
  import { formatIsoDate, parseIsoDate } from './dates'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  const iso = $derived(asString(view.value))
  let date = $derived(parseIsoDate(iso) ?? new Date())
</script>

<div class="cal">
  <MonthCalendar
    disabled={!asBoolean(view.enabled, true)}
    bind:value={
      () => date,
      (v) => {
        date = v
        setterOf(view, 'value')(formatIsoDate(v, iso))
      }
    }
  />
</div>

<style>
  .cal {
    align-self: flex-start;
  }
</style>
