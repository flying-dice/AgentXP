<script lang="ts">
  import KitButton from '$lib/kit/atoms/Button.svelte'
  import { asAction, asBoolean, asString } from '../viewProps'
  import { toIcon } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const action = $derived(asAction(view.action))
  /** Failing `checks` disable the button, as the A2UI spec asks of buttons. */
  const valid = $derived(view.isValid !== false)
</script>

<div class="button">
  <KitButton isDefault={asBoolean(view.isDefault)} icon={toIcon(view.icon)} disabled={!asBoolean(view.enabled, true) || !valid} onclick={() => action?.()}>
    {asString(view.text)}
  </KitButton>
</div>

<style>
  .button {
    align-self: flex-start;
  }
</style>
