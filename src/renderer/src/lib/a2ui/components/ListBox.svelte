<script lang="ts">
  import ListBox from '$lib/kit/atoms/ListBox.svelte'
  import { asBoolean, asStringList, setterOf } from '../viewProps'
  import { toOptions } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let selected = $derived(asStringList(view.selected))
</script>

<ListBox
  items={toOptions(view.options)}
  selectionMode={asBoolean(view.multi) ? 'MultiExtended' : 'One'}
  disabled={!asBoolean(view.enabled, true)}
  width="100%"
  bind:selected={
    () => selected,
    (v) => {
      selected = v.map(String)
      setterOf(view, 'selected')(selected)
    }
  }
/>
