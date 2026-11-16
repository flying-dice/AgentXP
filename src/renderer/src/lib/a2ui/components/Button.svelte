<script lang="ts">
  import KitButton from '$lib/kit/atoms/Button.svelte'
  import { asAction, asBoolean, asString } from '../viewProps'
  import { sentLine, useSurfaceSubmit } from '../surfaceSubmit.svelte'
  import { toIcon } from './options'
  import type { A2uiComponentProps } from './types'

  let { node, view }: A2uiComponentProps = $props()

  const submit = useSurfaceSubmit()

  const action = $derived(asAction(view.action))
  /** Failing `checks` disable the button, as the A2UI spec asks of buttons. */
  const valid = $derived(view.isValid !== false)
  /** This button sent the form and the reply is not in yet: it says so and cannot send again. */
  const sending = $derived(submit.phase === 'sending' && action !== undefined)
  const sent = $derived(submit.phase === 'sent' && submit.sourceId === node.componentId)
</script>

<div class="button">
  <KitButton data-testid="a2ui-button" isDefault={asBoolean(view.isDefault)} icon={toIcon(view.icon)} disabled={!asBoolean(view.enabled, true) || !valid || sending} onclick={() => action?.()}>
    {sending && submit.sourceId === node.componentId ? 'Sending...' : asString(view.text)}
  </KitButton>
  {#if sent}<div class="sent" role="status" data-testid="a2ui-sent">{sentLine(submit.reply)}</div>{/if}
</div>

<style>
  .button {
    align-self: flex-start;
  }
  .sent {
    margin-top: 2px;
    color: var(--w7-text-muted);
  }
</style>
