<script lang="ts">
  import KitDiffViewer from '$lib/kit/organisms/DiffViewer.svelte'
  import { asEnum, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let mode = $derived(asEnum(view.mode, ['unified', 'split'], 'unified'))
</script>

<KitDiffViewer
  unified={view.diff === undefined ? undefined : asString(view.diff)}
  oldText={asString(view.oldText)}
  newText={asString(view.newText)}
  fileName={view.path === undefined ? undefined : asString(view.path)}
  bind:mode
  maxHeight="360px"
/>
