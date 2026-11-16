<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import Balloon from './Balloon.svelte'

  const { Story } = defineMeta({
    title: 'Desktop/Balloon',
    component: Balloon,
    args: { title: 'Safe To Remove Hardware', text: "The 'claude-code-win (E:)' device can now be safely removed from the computer.", icon: 'usb-safe', onclose: fn() },
    argTypes: { icon: { control: 'select', options: ['usb-safe', 'info', 'warning'] }, onclose: { action: 'close' } }
  })
</script>

<Story name="SafeToRemove">
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="Information" args={{ title: 'Agent7', text: 'The agent finished the task.', icon: 'info' }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    padding: 24px 24px 40px;
    background: var(--w7-desktop-bg);
  }
</style>
