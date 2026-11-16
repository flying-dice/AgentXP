<script lang="ts">
  import TrackBar from '$lib/kit/atoms/TrackBar.svelte'
  import { asBoolean, asNumber, setterOf } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let num = $derived(asNumber(view.value, 0) ?? 0)
</script>

<TrackBar
  min={asNumber(view.min, 0)}
  max={asNumber(view.max, 10)}
  disabled={!asBoolean(view.enabled, true)}
  bind:value={
    () => num,
    (v) => {
      num = v
      setterOf(view, 'value')(v)
    }
  }
/>
