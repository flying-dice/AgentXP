<script lang="ts">
  import TextBox from '$lib/kit/atoms/TextBox.svelte'
  import { asBoolean, asString, asStringList, setterOf } from '../viewProps'
  import Validated from './Validated.svelte'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let text = $derived(asString(view.value))
  const errors = $derived(asStringList(view.validationErrors))
</script>

<Validated {errors}>
  <TextBox
    multiline={asBoolean(view.multiline)}
    password={asBoolean(view.password)}
    placeholder={asString(view.placeholder) || undefined}
    disabled={!asBoolean(view.enabled, true)}
    aria-invalid={errors.length > 0}
    bind:value={
      () => text,
      (v) => {
        text = v
        setterOf(view, 'value')(v)
      }
    }
  />
</Validated>
