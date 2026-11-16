<script lang="ts">
  import LinkLabel from '$lib/kit/atoms/LinkLabel.svelte'
  import { asAction, asBoolean, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  const action = $derived(asAction(view.action))
</script>

<div class="link">
  <LinkLabel text={asString(view.text)} disabled={!asBoolean(view.enabled, true)} onclick={() => action?.()} />
</div>

<style>
  .link {
    align-self: flex-start;
  }
</style>
