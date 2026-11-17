<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import NewChatDialog from './NewChatDialog.svelte'
  import { systemDrive, usbDrive } from '../app/fakeVfs'

  const system = systemDrive()

  const { Story } = defineMeta({
    title: 'Desktop/NewChatDialog',
    component: NewChatDialog,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { drives: [system, usbDrive('E', { id: 1, name: 'claude-code-win' })], onstart: fn(), oncancel: fn() },
    argTypes: { onstart: { action: 'start' }, oncancel: { action: 'cancel' } }
  })
</script>

<Story name="WithUsbDrive">
  {#snippet template(args)}<div class="stage"><NewChatDialog {...args} /></div>{/snippet}
</Story>
<Story name="OnlyC" args={{ drives: [system] }}>
  {#snippet template(args)}<div class="stage"><NewChatDialog {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
</style>
