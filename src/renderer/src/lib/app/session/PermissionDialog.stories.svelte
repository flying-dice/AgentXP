<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import PermissionDialog from './PermissionDialog.svelte'
  import { permissionOptions, permissionTurn } from './session.fixtures'

  const { Story } = defineMeta({
    title: 'App/Session/PermissionDialog',
    component: PermissionDialog,
    parameters: { layout: 'fullscreen' },
    args: { agentName: 'Claude Code', title: 'Edit src/auth/redirect.ts', options: permissionOptions, onanswer: fn() },
    argTypes: { agentName: { control: 'text' }, title: { control: 'text' }, onanswer: { action: 'answer' } }
  })

  const edit = permissionTurn().state.toolCalls['t2']
</script>

<Story name="EditWithDiff" args={{ toolCall: edit }}>
  {#snippet template(args)}<div class="stage"><PermissionDialog {...args} /></div>{/snippet}
</Story>

<Story
  name="BashCommand"
  args={{
    title: 'Run npm test -- auth',
    toolCall: { title: 'npm test -- auth', kind: 'execute', status: 'pending', rawInput: '{"command":"npm test -- auth && git push origin main"}', locations: [], contents: [] }
  }}
>
  {#snippet template(args)}<div class="stage"><PermissionDialog {...args} /></div>{/snippet}
</Story>

<Story name="OnlyOnceOptions" args={{ title: 'Fetch https://example.com', options: permissionOptions.filter((o) => o.kind.endsWith('once')) }}>
  {#snippet template(args)}<div class="stage"><PermissionDialog {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: var(--w7-desktop-bg);
  }
</style>
