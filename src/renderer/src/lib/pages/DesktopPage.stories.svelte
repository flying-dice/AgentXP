<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DesktopPage from './DesktopPage.svelte'
  import MessageBoxHost from '../kit/organisms/MessageBoxHost.svelte'
  import { prepareDesktop } from '../desktop/stories.fixtures'

  const { Story } = defineMeta({
    title: 'Desktop/DesktopPage',
    component: DesktopPage,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })
</script>

<Story name="Default" asChild>
  {#await prepareDesktop() then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /><MessageBoxHost contained /></div>
  {/await}
</Story>

<Story name="PaintNotesAndEvents" asChild>
  {#await prepareDesktop({ windows: false, apps: ['event-viewer', 'paint', 'sticky-notes'], draw: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="SnipOverlay" asChild>
  {#await prepareDesktop({ apps: ['snipping-tool'], snip: 'rect' }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="StartMenuOpen" asChild>
  {#await prepareDesktop({ startOpen: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="ActionCenterOpen" asChild>
  {#await prepareDesktop({ approval: true, actionCenter: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="ApprovalDialog" asChild>
  {#await prepareDesktop({ approval: true, review: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="MaximisedWindow" asChild>
  {#await prepareDesktop({ maximizeChat: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="PausedAgentOpenedWindow" asChild>
  {#await prepareDesktop({ paused: true, agentOpened: true, approval: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<Story name="FirstRunWelcome" asChild>
  {#await prepareDesktop({ firstRun: true }) then { api, controller }}
    <div class="stage"><DesktopPage {api} {controller} /></div>
  {/await}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }
</style>
