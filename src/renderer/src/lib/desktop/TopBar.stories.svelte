<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import TopBar from './TopBar.svelte'

  const { Story } = defineMeta({
    title: 'Desktop/TopBar',
    component: TopBar,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      title: 'claude-code-win',
      working: 'Read src/auth/redirect.ts',
      paused: false,
      userInControl: false,
      tools: ['shell', 'fs.read', 'fs.write', 'terminal'],
      maximized: false,
      onpause: fn(),
      ontakecontrol: fn(),
      onminimize: fn(),
      onmaximize: fn(),
      ondisconnect: fn()
    },
    argTypes: { title: { control: 'text' }, working: { control: 'text' }, paused: { control: 'boolean' }, userInControl: { control: 'boolean' }, tools: { control: 'object' }, maximized: { control: 'boolean' }, onminimize: { action: 'minimize' }, onmaximize: { action: 'maximize' }, ondisconnect: { action: 'disconnect' }, onpause: { action: 'pause' }, ontakecontrol: { action: 'take control' } }
  })
</script>

<Story name="Working">
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="Idle" args={{ working: null, tools: ['shell'] }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="PausedAndInControl" args={{ paused: true, userInControl: true }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 120px;
    background: var(--w7-desktop-bg);
  }
</style>
