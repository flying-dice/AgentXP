<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import StartMenu from './StartMenu.svelte'
  import type { StartItem } from './StartMenu'

  const programs: StartItem[] = [
    { id: 'chat', title: 'New chat', description: 'Talk to the agent about this work', icon: 'session' },
    { id: 'explorer', title: 'Explorer', description: 'Browse the workspace', icon: 'folder' },
    { id: 'notepad', title: 'Notepad', description: 'Edit a text file', icon: 'file-text' },
    { id: 'code', title: 'Code', description: 'Read code and review changes', icon: 'file-code' },
    { id: 'terminal', title: 'Terminal', description: 'Run commands', icon: 'terminal' },
    { id: 'browser', title: 'Browser', description: 'Browse the web', icon: 'globe' }
  ]
  const recent: StartItem[] = [
    { id: '1', title: 'Fix login redirect bug' },
    { id: '2', title: 'Add parser unit tests' },
    { id: '3', title: 'Refactor config loader' }
  ]
  const places: StartItem[] = [
    { id: 'workspace', title: 'Workspace' },
    { id: 'control-centre', title: 'Control Center' },
    { id: 'agent-manager', title: 'Agent Manager' },
    { id: 'new-desktop', title: 'New desktop…' }
  ]

  const { Story } = defineMeta({
    title: 'Organisms/StartMenu',
    component: StartMenu,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { programs, recent, places, powerLabel: 'Pause agent', query: '', onrun: fn(), onrecent: fn(), onplace: fn(), onpower: fn(), ondisconnect: fn(), onswitch: fn(), ondelete: fn(), onclose: fn() },
    argTypes: { powerLabel: { control: 'text' }, query: { control: 'text' }, onrun: { action: 'run' }, onrecent: { action: 'recent' }, onplace: { action: 'place' }, onpower: { action: 'power' }, ondisconnect: { action: 'disconnect' }, onswitch: { action: 'switch desktop' }, ondelete: { action: 'delete desktop' }, onclose: { action: 'close' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><StartMenu {...args} /></div>{/snippet}
</Story>
<Story name="Searching" args={{ query: 'ex' }}>
  {#snippet template(args)}<div class="stage"><StartMenu {...args} /></div>{/snippet}
</Story>
<Story name="NoMatch" args={{ query: 'zzz' }}>
  {#snippet template(args)}<div class="stage"><StartMenu {...args} /></div>{/snippet}
</Story>
<Story name="Paused" args={{ powerLabel: 'Resume agent' }}>
  {#snippet template(args)}<div class="stage"><StartMenu {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    height: 100vh;
    box-sizing: border-box;
    padding: 60px 0 0 0;
    background: var(--w7-desktop-bg);
  }
</style>
