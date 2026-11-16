<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import WindowLayer from './WindowLayer.svelte'
  import { prepareDesktop } from './stories.fixtures'

  const { Story } = defineMeta({
    title: 'Desktop/WindowLayer',
    component: WindowLayer,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })
</script>

<Story name="DragAndResize" asChild>
  {#await prepareDesktop() then { controller }}
    <div class="stage"><WindowLayer desktop={controller} /><p class="hint">Drag by the title bar, resize from any edge, double-click a title bar to maximise.</p></div>
  {/await}
</Story>

<Story name="AgentOpenedWindow" asChild>
  {#await prepareDesktop({ agentOpened: true }) then { controller }}
    <div class="stage"><WindowLayer desktop={controller} /></div>
  {/await}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop-bg);
  }
  .hint {
    position: absolute;
    left: 12px;
    bottom: 8px;
    margin: 0;
    color: #fff;
    text-shadow: 0 0 3px #000;
  }
</style>
