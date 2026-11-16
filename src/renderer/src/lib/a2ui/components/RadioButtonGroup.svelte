<script lang="ts">
  import RadioButton from '$lib/kit/atoms/RadioButton.svelte'
  import RadioButtonGroup from '$lib/kit/atoms/RadioButtonGroup.svelte'
  import { asBoolean, asEnum, asString, setterOf } from '../viewProps'
  import { toOptions } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let value = $derived(asString(view.value))
</script>

<RadioButtonGroup
  orientation={asEnum(view.orientation, ['vertical', 'horizontal'], 'vertical')}
  disabled={!asBoolean(view.enabled, true)}
  bind:value={
    () => value,
    (v) => {
      value = v
      setterOf(view, 'value')(v)
    }
  }
>
  {#each toOptions(view.options) as option (option.value)}
    <RadioButton value={option.value} label={option.label} />
  {/each}
</RadioButtonGroup>
