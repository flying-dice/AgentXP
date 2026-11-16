<script lang="ts">
  import KitCodeViewer from '$lib/kit/organisms/CodeViewer.svelte'
  import { asArray, asNumber, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  const highlight = $derived(asArray(view.highlightLines).map((n) => asNumber(n)).filter((n): n is number => n !== undefined))
</script>

<KitCodeViewer code={asString(view.code)} language={asString(view.language, 'text')} highlightLines={highlight} toolbar maxHeight="320px" />
