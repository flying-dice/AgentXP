<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import AutoPlayDialog from './AutoPlayDialog.svelte'
  import { usbDrive } from '../app/fakeVfs'

  const { Story } = defineMeta({
    title: 'Desktop/AutoPlayDialog',
    component: AutoPlayDialog,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { drive: usbDrive('E', { id: 1, name: 'claude-code-win' }), onchoose: fn() },
    argTypes: { onchoose: { action: 'choose' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><AutoPlayDialog {...args} /></div>{/snippet}
</Story>

<Story name="SecondDrive" args={{ drive: usbDrive('F', { id: 2, name: 'dotfiles' }) }}>
  {#snippet template(args)}<div class="stage"><AutoPlayDialog {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
</style>
