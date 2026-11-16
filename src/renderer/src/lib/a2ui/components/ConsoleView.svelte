<script lang="ts">
  import KitConsoleView from '$lib/kit/organisms/ConsoleView.svelte'
  import { asBoolean, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
</script>

<KitConsoleView text={asString(view.text)} running={asBoolean(view.running)} maxHeight="240px" />
