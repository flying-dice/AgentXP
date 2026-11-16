<script lang="ts">
  import { untrack } from 'svelte'
  import type { A2uiClientEvent, A2uiServerMessage } from '@shared/a2ui'
  import NodeView from './NodeView.svelte'
  import { SurfaceController } from './SurfaceController'
  import { useSignal } from './signals.svelte'
  import { provideSurfaceSubmit, SENDING_TIMEOUT_MS, SurfaceSubmit } from './surfaceSubmit.svelte'

  interface Props {
    /** The replayable A2UI messages of one surface (createSurface, updateComponents, updateDataModel, ...). */
    messages: readonly A2uiServerMessage[]
    /** Called when the user triggers an action; carries the resolved context and the data model. */
    onaction?: (event: A2uiClientEvent) => void
    /** Session owning the surface; copied into every event. */
    sessionId?: number
    /** True while the agent works on a turn: the form says "Sending..." until the reply is in, then "Sent." Omit it when unknown. */
    busy?: boolean
    /** The agent's latest reply as plain text; the form quotes it under the button: "Sent. The agent answered: ...". */
    reply?: string
    class?: string
  }

  let { messages, onaction, sessionId, busy, reply, class: className = '' }: Props = $props()

  const controller = new SurfaceController()
  const submit = new SurfaceSubmit()
  provideSurfaceSubmit(submit)

  const send = (event: A2uiClientEvent): void => {
    submit.begin(event.sourceComponentId)
    onaction?.(event)
  }

  $effect(() => {
    submit.reply = reply ?? ''
  })
  $effect(() => submit.follow(busy))
  // A reply that never ends the turn (or a surface without a store) must not leave the button disabled for good.
  $effect(() => {
    if (submit.phase !== 'sending') return
    const timer = setTimeout(() => submit.finish(), SENDING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  })
  // The agent drew the form again after "Sent.": it can be sent again.
  $effect(() => {
    void messages.length
    untrack(() => submit.reset()) // reset reads the phase: without untrack "sent" would reset itself at once
  })

  // Messages are replayed on top of what is applied; options are read at dispatch time.
  $effect.pre(() => {
    controller.setOptions({ sessionId, onaction: send })
    controller.sync(messages)
  })
  $effect(() => () => controller.dispose())

  const root = useSignal(() => controller.root)
</script>

<!-- Editing a field again ends "Sent." (input and change bubble from every field of the form). -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="a2ui-surface {className}" data-a2ui-surface data-testid="a2ui-surface" oninput={() => submit.reset()} onchange={() => submit.reset()}>
  {#if root.current}
    {#key root.current.id}
      <NodeView node={root.current} />
    {/key}
  {/if}
</div>

<style>
  .a2ui-surface {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font: var(--w7-font);
    color: var(--w7-text);
  }
</style>
