<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import DesktopIcon from './DesktopIcon.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/DesktopIcon',
    component: DesktopIcon,
    parameters: { layout: 'centered', backgrounds: { disable: true } },
    args: { label: 'Workspace (W:)', icon: 'folder-open', selected: false, onselect: fn(), onopen: fn() },
    argTypes: { label: { control: 'text' }, selected: { control: 'boolean' }, onselect: { action: 'select' }, onopen: { action: 'open' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><DesktopIcon {...args} /></div>{/snippet}
</Story>
<Story name="Selected" args={{ selected: true }}>
  {#snippet template(args)}<div class="stage"><DesktopIcon {...args} /></div>{/snippet}
</Story>
<Story name="LongLabel" args={{ label: 'A very long file name that wraps.log', icon: 'file-text' }}>
  {#snippet template(args)}<div class="stage"><DesktopIcon {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    padding: 30px 60px;
    background: var(--xp-desktop-bg);
  }
</style>
