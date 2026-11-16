<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import WelcomeDialog from './WelcomeDialog.svelte'

  const { Story } = defineMeta({
    title: 'Desktop/WelcomeDialog',
    component: WelcomeDialog,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { onopen: fn() },
    argTypes: { onopen: { action: 'open' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><WelcomeDialog {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop-bg);
  }
</style>
