<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import A2uiSurface from '../../a2ui/A2uiSurface.svelte'
  import { useSessionStores } from '../sessionStores.svelte'

  let { window: win, host }: AppProps<'surface'> = $props()

  const sessionId = $derived(win.view.sessionId)
  const surfaceId = $derived(win.view.surfaceId)
  // The chat's store is shared with its Chat window, so an action goes back through the same AG-UI thread
  // (and works while the Chat window is closed).
  // svelte-ignore state_referenced_locally
  const stores = useSessionStores(host)
  $effect(() => {
    if (sessionId > 0) untrack(() => stores.open(sessionId))
  })
  const store = $derived(sessionId > 0 ? (stores.peek(sessionId) ?? null) : null)
  const surface = $derived(store?.activities.get(surfaceId))
</script>

<div class="surface-app w7-scroll" data-testid="surface-app" data-surface-id={surfaceId}>
  {#if surface}
    <A2uiSurface messages={surface.messages} {sessionId} busy={store?.running} onaction={(event) => void store?.sendA2uiAction(event)} />
  {:else}
    <div class="blank">{store ? 'This surface was deleted.' : 'Opening the surface...'}</div>
  {/if}
</div>

<style>
  .surface-app {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px;
    background: var(--w7-window);
  }
  .blank {
    color: var(--w7-text-muted);
  }
</style>
