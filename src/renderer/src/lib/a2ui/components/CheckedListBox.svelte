<script lang="ts">
  import CheckedListBox from '$lib/kit/atoms/CheckedListBox.svelte'
  import { asBoolean, asStringList, setterOf } from '../viewProps'
  import { toOptions } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let checked = $derived(asStringList(view.checked))
</script>

<CheckedListBox
  items={toOptions(view.options)}
  disabled={!asBoolean(view.enabled, true)}
  width="100%"
  bind:checked={
    () => checked,
    (v) => {
      checked = v.map(String)
      setterOf(view, 'checked')(checked)
    }
  }
/>
