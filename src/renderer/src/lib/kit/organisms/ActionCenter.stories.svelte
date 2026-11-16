<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import ActionCenter from './ActionCenter.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/ActionCenter',
    component: ActionCenter,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      approvals: [{ key: '1:7', title: 'Run a command', detail: "In chat 'Fix login redirect bug' (started 10:42)" }],
      messages: [
        { id: 1, text: 'Context is at 39%. The agent compacts automatically at 80%.' },
        { id: 2, text: 'Opened C:\\Users\\jonathan\\source\\claude-code-win' }
      ],
      onreview: fn(),
      onopencontrolcentre: fn(),
      onclose: fn()
    },
    argTypes: { onreview: { action: 'review' }, onopencontrolcentre: { action: 'open control center' }, onclose: { action: 'close' } }
  })
</script>

<Story name="WithApproval">
  {#snippet template(args)}<div class="stage"><ActionCenter {...args} /></div>{/snippet}
</Story>
<Story name="Two" args={{ approvals: [{ key: 'a', title: 'Change src/auth/redirect.ts', detail: "In chat 'Fix login redirect bug' (started 10:42)" }, { key: 'b', title: 'Run a command', detail: "In chat 'Add parser unit tests' (started 11:05)" }] }}>
  {#snippet template(args)}<div class="stage"><ActionCenter {...args} /></div>{/snippet}
</Story>
<Story name="AfterResume" args={{ approvals: [], messages: [{ id: 1, text: "In chat 'Fix login redirect bug': Resumed. The step that was stopped stays stopped. Send a message to continue.", continueId: 1 }] }}>
  {#snippet template(args)}<div class="stage"><ActionCenter {...args} /></div>{/snippet}
</Story>
<Story name="Empty" args={{ approvals: [], messages: [] }}>
  {#snippet template(args)}<div class="stage"><ActionCenter {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    height: 100vh;
    box-sizing: border-box;
    padding: 0 12px 12px 0;
    background: var(--w7-desktop-bg);
  }
</style>
