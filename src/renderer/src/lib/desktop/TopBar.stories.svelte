<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import { DEFAULT_TOOL_POLICY } from '@shared/desktop'
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
      policy: DEFAULT_TOOL_POLICY,
      onopenworking: fn(),
      maximized: false,
      onpause: fn(),
      ontakecontrol: fn(),
      onopenpermissions: fn(),
      onminimize: fn(),
      onmaximize: fn(),
      ondisconnect: fn()
    },
    argTypes: { title: { control: 'text' }, working: { control: 'text' }, paused: { control: 'boolean' }, userInControl: { control: 'boolean' }, maximized: { control: 'boolean' }, onminimize: { action: 'minimize' }, onmaximize: { action: 'maximize' }, ondisconnect: { action: 'disconnect' }, onpause: { action: 'pause' }, ontakecontrol: { action: 'take control' } }
  })
</script>

<Story name="Working">
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="Idle" args={{ working: null }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="PausedAndInControl" args={{ paused: true, userInControl: true }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>

<Story name="WaitingForYou" args={{ working: 'Change src/auth/redirect.ts', waiting: 2 }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="ResumedNothingStopped" args={{ working: null, notice: 'Resumed. Nothing was stopped.' }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>

<Story name="AsksBeforeEveryAction" args={{ userInControl: true, policy: DEFAULT_TOOL_POLICY }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="PermissionsShownOnChips" args={{ policy: { ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, browser: 'deny' } } }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="SeveralAgentsWorking" args={{ working: 'Read a file', agents: [{ sessionId: 1, title: 'Fix login', identity: { name: 'Builder', color: '#1f6feb' }, step: 'reading auth.ts' }, { sessionId: 2, title: 'Review', identity: { name: 'Reviewer', color: '#b5179e' }, step: 'running npm test' }] }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="Following" args={{ working: 'Read a file', following: { sessionId: 1, keep: false, identity: { name: 'Builder', color: '#1f6feb' } } }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>
<Story name="FollowEnded" args={{ working: null, followNotice: 'Stopped following Builder: the turn ended.' }}>
  {#snippet template(args)}<div class="stage"><TopBar {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 120px;
    background: var(--xp-desktop-bg);
  }
</style>
