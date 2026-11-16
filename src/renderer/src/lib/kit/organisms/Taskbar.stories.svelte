<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Taskbar, { type TaskbarItem } from './Taskbar.svelte'

  const items: TaskbarItem[] = [
    { id: 'explorer', title: 'Explorer', icon: 'folder', pinned: true },
    { id: 'claude', title: 'Claude Code', icon: 'claude', running: true, active: true },
    { id: 'term', title: 'Terminal', icon: 'terminal', running: true }
  ]

  const { Story } = defineMeta({
    title: 'Organisms/Taskbar',
    component: Taskbar,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { items, startOpen: false, clock: new Date(2026, 10, 16, 1, 47) },
    argTypes: {
      items: { control: 'object' },
      startOpen: { control: 'boolean' },
      onstart: { action: 'start' },
      onitemclick: { action: 'itemclick' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="bg"><Taskbar {...args} /></div>
  {/snippet}
</Story>

<Story name="LiveClock" args={{ clock: undefined }}>
  {#snippet template(args)}
    <div class="bg"><Taskbar {...args} /></div>
  {/snippet}
</Story>

<Story name="Interactive" args={{ clock: undefined }} parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    <div class="bg"><Taskbar {...args} /></div>
    <p class="hint">Hover the buttons for the glossy glow; Tab to the taskbar and use Left/Right.</p>
  {/snippet}
</Story>

<style>
  .bg {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--w7-desktop-bg);
    padding-top: 60px;
  }
  .hint {
    margin: 12px;
    font-size: 11px;
  }
</style>
