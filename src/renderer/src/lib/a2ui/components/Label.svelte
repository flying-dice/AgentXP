<script lang="ts">
  import KitLabel from '$lib/kit/atoms/Label.svelte'
  import { asBoolean, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
</script>

<KitLabel text={asString(view.text)} disabled={!asBoolean(view.enabled, true)} />
