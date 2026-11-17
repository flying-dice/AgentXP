<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import StickyNotesLayer from './StickyNotesLayer.svelte'
  import WindowLayer from './WindowLayer.svelte'
  import { prepareDesktop } from './stories.fixtures'

  const { Story } = defineMeta({
    title: 'Desktop/StickyNotesLayer',
    component: StickyNotesLayer,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })
</script>

<Story name="Default" asChild>
  {#await prepareDesktop({ windows: false, apps: ['sticky-notes'] }) then { controller }}
    <div class="stage">
      <StickyNotesLayer desktop={controller} />
      <WindowLayer desktop={controller} />
      <p class="hint">Drag a note by its top bar, resize from the corner, right-click for colours, + adds a note.</p>
    </div>
  {/await}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
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
