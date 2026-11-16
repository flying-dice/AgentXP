<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import ConnectionBar from './ConnectionBar.svelte'

  const { Story } = defineMeta({
    title: 'Desktop/ConnectionBar',
    component: ConnectionBar,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { title: 'claude-code-win', pinned: true, maximized: false, onminimize: fn(), onmaximize: fn(), ondisconnect: fn() },
    argTypes: { title: { control: 'text' }, pinned: { control: 'boolean' }, maximized: { control: 'boolean' }, onminimize: { action: 'minimize' }, onmaximize: { action: 'maximize' }, ondisconnect: { action: 'disconnect' } }
  })
</script>

<Story name="Pinned">
  {#snippet template(args)}<div class="stage"><ConnectionBar {...args} /></div>{/snippet}
</Story>
<Story name="Unpinned" args={{ pinned: false }}>
  {#snippet template(args)}<div class="stage"><ConnectionBar {...args} /></div>{/snippet}
</Story>
<Story name="Maximized" args={{ maximized: true }}>
  {#snippet template(args)}<div class="stage"><ConnectionBar {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    width: 420px;
    padding: 0 8px;
    background: #e6edf7;
  }
</style>
