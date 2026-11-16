<script lang="ts">
  import ComboBox from '$lib/kit/atoms/ComboBox.svelte'
  import { asBoolean, asString, asStringList, setterOf } from '../viewProps'
  import { toOptions } from './options'
  import Validated from './Validated.svelte'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let value = $derived(asString(view.value))
  const errors = $derived(asStringList(view.validationErrors))
</script>

<Validated {errors}>
  <ComboBox
    items={toOptions(view.options)}
    disabled={!asBoolean(view.enabled, true)}
    bind:value={
      () => value,
      (v) => {
        value = v
        setterOf(view, 'value')(v)
      }
    }
  />
</Validated>
