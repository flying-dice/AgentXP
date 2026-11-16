<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import UacDialog from './UacDialog.svelte'
  import { approvalFromInterrupt } from './approval'
  import { permissionInterrupt, permissionTurn } from '../app/session/session.fixtures'

  const turn = permissionTurn()
  const edit = approvalFromInterrupt(2, turn.interrupt, turn.state)!
  const run = approvalFromInterrupt(
    3,
    permissionInterrupt('t9', 'Install a new package', 'execute'),
    { ...turn.state, toolCalls: { t9: { title: 'npm install zod@3.23.8', kind: 'execute', status: 'pending', rawInput: '{"command":"npm install zod@3.23.8"}', locations: [], contents: [] } } }
  )!

  const { Story } = defineMeta({
    title: 'Desktop/UacDialog',
    component: UacDialog,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { approval: edit, reason: 'Writing files is set to Ask in Control Center.', onanswer: fn(), onclose: fn() },
    argTypes: { reason: { control: 'text' }, onanswer: { action: 'answer' }, onclose: { action: 'close' } }
  })
</script>

<Story name="EditWithDiff">
  {#snippet template(args)}<div class="stage"><UacDialog {...args} /></div>{/snippet}
</Story>
<Story name="RunCommand" args={{ approval: run, reason: 'Running commands is set to Ask in Control Center.' }}>
  {#snippet template(args)}<div class="stage"><UacDialog {...args} /></div>{/snippet}
</Story>
<Story name="UserInControl" args={{ reason: 'Ask before every action is on, so every action needs your approval.' }}>
  {#snippet template(args)}<div class="stage"><UacDialog {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--w7-desktop-bg);
  }
</style>
