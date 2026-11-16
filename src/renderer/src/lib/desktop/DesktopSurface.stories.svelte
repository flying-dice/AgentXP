<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import DesktopSurface from './DesktopSurface.svelte'

  const icons = [
    { id: 'workspace', label: 'Workspace (W:)', icon: 'folder-open' },
    { id: 'chats', label: 'Chats', icon: 'session' },
    { id: 'code', label: 'Code', icon: 'file-code' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'browser', label: 'Browser', icon: 'globe' },
    { id: 'control-centre', label: 'Control Centre', icon: 'options' },
    { id: 'recycle', label: 'Recycle Bin', icon: 'delete' }
  ] as const

  const { Story } = defineMeta({
    title: 'Desktop/DesktopSurface',
    component: DesktopSurface,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { icons: [...icons], selected: null, gadgets: true, onselect: fn(), onopen: fn(), onnewchat: fn(), onopenworkspace: fn(), ontogglegadgets: fn(), oncontrolcentre: fn(), onbackground: fn() },
    argTypes: { selected: { control: 'text' }, gadgets: { control: 'boolean' } }
  })
</script>

<Story name="Icons">
  {#snippet template(args)}<div class="stage"><DesktopSurface {...args} /></div>{/snippet}
</Story>
<Story name="Selected" args={{ selected: 'code' }}>
  {#snippet template(args)}<div class="stage"><DesktopSurface {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop-bg);
  }
</style>
