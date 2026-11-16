<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Transcript from './Transcript.svelte'
  import { completedTurn, emptyTurn, permissionTurn, runningTurn, surfaceTurn } from './session.fixtures'

  const { Story } = defineMeta({
    title: 'App/Session/Transcript',
    component: Transcript,
    args: { sessionId: 1, agentName: 'Claude Code', folderName: 'claude-code-win', running: false, problem: null, waitingToolCallId: null },
    argTypes: { running: { control: 'boolean' }, agentName: { control: 'text' } }
  })

  const completed = completedTurn()
  const empty = emptyTurn()
  const permission = permissionTurn()
  const running = runningTurn()
  const surface = surfaceTurn()
</script>

<Story name="Empty" args={{ messages: empty.messages, agentState: empty.state, activities: new Map() }}>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<Story name="CompletedTurn" args={{ messages: completed.messages, agentState: completed.state, activities: new Map() }}>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<Story name="WaitingForPermission" args={{ messages: permission.messages, agentState: permission.state, activities: new Map(), waitingToolCallId: 't2' }}>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<Story name="Running" args={{ messages: running.messages, agentState: running.state, activities: new Map(), running: true }}>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<Story
  name="AgentStopped"
  args={{
    messages: completed.messages,
    agentState: completed.state,
    activities: new Map(),
    problem: { text: 'The agent stopped unexpectedly. Your request was not finished.', detail: 'ACP connection closed', actions: [{ id: 'restart-send', label: 'Restart and send again' }, { id: 'details', label: 'Details...' }] }
  }}
>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<Story name="WithSurface" args={{ messages: surface.messages, agentState: surface.state, activities: surface.activities }}>
  {#snippet template(args)}<div class="box"><Transcript {...args} /></div>{/snippet}
</Story>

<style>
  .box {
    display: flex;
    flex-direction: column;
    width: 600px;
    height: 460px;
  }
</style>
