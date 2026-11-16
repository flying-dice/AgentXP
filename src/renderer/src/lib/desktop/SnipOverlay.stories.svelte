<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import WindowLayer from './WindowLayer.svelte'
  import SnipOverlay from './SnipOverlay.svelte'
  import { prepareDesktop } from './stories.fixtures'

  const { Story } = defineMeta({
    title: 'Desktop/SnipOverlay',
    component: SnipOverlay,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })
</script>

<Story name="Rectangular" asChild>
  {#await prepareDesktop() then { controller }}
    <div class="stage">
      <WindowLayer desktop={controller} />
      <SnipOverlay mode="rect" onpick={() => {}} oncancel={() => {}} />
    </div>
  {/await}
</Story>

<Story name="Window" asChild>
  {#await prepareDesktop() then { controller }}
    <div class="stage">
      <WindowLayer desktop={controller} />
      <SnipOverlay mode="window" windows={controller.state.windows.map((w) => ({ id: w.id, bounds: w.bounds }))} onpick={() => {}} oncancel={() => {}} />
    </div>
  {/await}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop-bg);
  }
</style>
