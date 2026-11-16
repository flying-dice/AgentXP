<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import SessionView from './SessionView.svelte'
  import SessionViewHarness from './SessionViewHarness.svelte'
  import { agent, completedTurn, emptyTurn, folder, permissionTurn, runningTurn, session, surfaceTurn } from './session.fixtures'

  const { Story } = defineMeta({
    title: 'App/Session/SessionView',
    component: SessionView,
    parameters: { layout: 'fullscreen' },
    args: { session, folder, agent, openFilePath: 'C:\\Users\\jonathan\\source\\claude-code-win\\src\\auth\\redirect.ts' },
    argTypes: { openFilePath: { control: 'text' } }
  })

  const permission = permissionTurn()
</script>

<Story name="Empty">
  {#snippet template(args)}<SessionViewHarness {...args} init={emptyTurn()} />{/snippet}
</Story>

<Story name="CompletedTurn">
  {#snippet template(args)}<SessionViewHarness {...args} init={completedTurn()} />{/snippet}
</Story>

<Story name="RunningWithPermissionPrompt">
  {#snippet template(args)}<SessionViewHarness {...args} init={{ ...permission, running: false }} />{/snippet}
</Story>

<Story name="RunningBashCommand">
  {#snippet template(args)}<SessionViewHarness {...args} init={{ ...runningTurn(), running: true }} />{/snippet}
</Story>

<Story name="A2uiSurface">
  {#snippet template(args)}<SessionViewHarness {...args} init={surfaceTurn()} />{/snippet}
</Story>

<Story name="Error">
  {#snippet template(args)}
    <SessionViewHarness {...args} init={{ ...completedTurn(), error: 'The agent process exited unexpectedly (code 1).' }} />
  {/snippet}
</Story>
