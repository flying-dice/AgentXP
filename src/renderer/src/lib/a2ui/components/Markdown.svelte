<script lang="ts">
  import MarkdownView from '$lib/kit/organisms/MarkdownView.svelte'
  import { asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
</script>

<MarkdownView source={asString(view.text)} />
