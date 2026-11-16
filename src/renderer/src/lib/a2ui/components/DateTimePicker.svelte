<script lang="ts">
  import DateTimePicker from '$lib/kit/atoms/DateTimePicker.svelte'
  import { asBoolean, asEnum, asString, setterOf } from '../viewProps'
  import { formatIsoDate, parseIsoDate } from './dates'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  const iso = $derived(asString(view.value))
  let date = $derived(parseIsoDate(iso) ?? new Date())
</script>

<DateTimePicker
  format={asEnum(view.format, ['Long', 'Short', 'Time'], 'Long')}
  disabled={!asBoolean(view.enabled, true)}
  bind:value={
    () => date,
    (v) => {
      date = v
      setterOf(view, 'value')(formatIsoDate(v, iso))
    }
  }
/>
