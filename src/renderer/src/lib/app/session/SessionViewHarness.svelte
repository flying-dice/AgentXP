<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import { FakeSessionStore, type FakeInit } from './FakeSessionStore.svelte'
  import SessionView from './SessionView.svelte'

  /** Story host: one fake store per mount, the view in a 600px pane and a log of the store calls below. */
  interface Props extends Omit<ComponentProps<typeof SessionView>, 'store'> {
    init: FakeInit
  }

  let { init, ...view }: Props = $props()

  const store = new FakeSessionStore(init)
  const pickFiles = async (): Promise<string[]> => ['C:\\Users\\jonathan\\notes\\login-bug.md']
  const setMode = async (): Promise<void> => {}
</script>

<div class="stage">
  <div class="pane"><SessionView {store} {setMode} {pickFiles} {...view} /></div>
  <pre class="calls">{store.calls.join('\n') || 'No store calls yet.'}</pre>
</div>

<style>
  .stage {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100vh;
    padding: 8px;
    box-sizing: border-box;
  }
  .pane {
    flex: 1;
    min-height: 0;
    width: 600px;
    position: relative;
  }
  .calls {
    flex: none;
    margin: 0;
    max-height: 60px;
    overflow: auto;
    font: var(--w7-font-mono);
    color: var(--w7-text-muted);
  }
</style>
