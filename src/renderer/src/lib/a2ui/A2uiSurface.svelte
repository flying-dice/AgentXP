<script lang="ts">
  import type { A2uiClientEvent, A2uiServerMessage } from '@shared/a2ui'
  import NodeView from './NodeView.svelte'
  import { SurfaceController } from './SurfaceController'
  import { useSignal } from './signals.svelte'

  interface Props {
    /** The replayable A2UI messages of one surface (createSurface, updateComponents, updateDataModel, ...). */
    messages: readonly A2uiServerMessage[]
    /** Called when the user triggers an action; carries the resolved context and the data model. */
    onaction?: (event: A2uiClientEvent) => void
    /** Session owning the surface; copied into every event. */
    sessionId?: number
    class?: string
  }

  let { messages, onaction, sessionId, class: className = '' }: Props = $props()

  const controller = new SurfaceController()

  // Messages are replayed on top of what is applied; options are read at dispatch time.
  $effect.pre(() => {
    controller.setOptions({ sessionId, onaction })
    controller.sync(messages)
  })
  $effect(() => () => controller.dispose())

  const root = useSignal(() => controller.root)
</script>

<div class="a2ui-surface {className}" data-a2ui-surface>
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
