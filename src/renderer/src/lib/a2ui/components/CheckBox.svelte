<script lang="ts">
  import CheckBox from '$lib/kit/atoms/CheckBox.svelte'
  import { asBoolean, asString, setterOf } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let checked = $derived(asBoolean(view.checked))
</script>

<div class="check">
  <CheckBox
    label={asString(view.text)}
    disabled={!asBoolean(view.enabled, true)}
    bind:checked={
      () => checked,
      (v) => {
        checked = v
        setterOf(view, 'checked')(v)
      }
    }
  />
</div>

<style>
  .check {
    align-self: flex-start;
  }
</style>
