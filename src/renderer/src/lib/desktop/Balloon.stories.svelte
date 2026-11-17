<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import Balloon from './Balloon.svelte'

  const { Story } = defineMeta({
    title: 'Desktop/Balloon',
    component: Balloon,
    args: { title: 'Project removed', text: "'claude-code-win' (E:) was removed from this desktop. Your files are still in the folder. Double-click it in Computer to plug it in again.", icon: 'usb-safe', onclose: fn() },
    argTypes: { icon: { control: 'select', options: ['usb-safe', 'info', 'warning'] }, onclose: { action: 'close' } }
  })
</script>

<Story name="SafeToRemove">
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<Story name="Information" args={{ title: 'AgentXP', text: 'The agent finished the task.', icon: 'info' }}>
  {#snippet template(args)}<div class="stage"><Balloon {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    padding: 24px 24px 40px;
    background: var(--xp-desktop-bg);
  }
</style>
