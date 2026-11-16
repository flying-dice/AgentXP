<script lang="ts">
  import NumericUpDown from '$lib/kit/atoms/NumericUpDown.svelte'
  import { asBoolean, asNumber, asStringList, setterOf } from '../viewProps'
  import Validated from './Validated.svelte'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let num = $derived(asNumber(view.value, 0) ?? 0)
  const errors = $derived(asStringList(view.validationErrors))
</script>

<Validated {errors}>
  <NumericUpDown
    min={asNumber(view.min, 0)}
    max={asNumber(view.max, 100)}
    step={asNumber(view.step, 1)}
    disabled={!asBoolean(view.enabled, true)}
    bind:value={
      () => num,
      (v) => {
        num = v
        setterOf(view, 'value')(v)
      }
    }
  />
</Validated>
