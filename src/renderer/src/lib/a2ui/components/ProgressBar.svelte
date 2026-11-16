<script lang="ts">
  import ProgressBar from '$lib/kit/atoms/ProgressBar.svelte'
  import { asEnum, asNumber } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
</script>

<ProgressBar
  value={asNumber(view.value, 0)}
  max={asNumber(view.max, 100)}
  style={asEnum(view.style, ['Continuous', 'Blocks', 'Marquee'], 'Continuous')}
  state={asEnum(view.state, ['normal', 'paused', 'error'], 'normal')}
  width="100%"
/>
