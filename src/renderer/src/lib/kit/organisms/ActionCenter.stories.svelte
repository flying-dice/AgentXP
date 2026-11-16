<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import ActionCenter from './ActionCenter.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/ActionCenter',
    component: ActionCenter,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      approvals: [{ key: '1:7', title: 'Install a new package', detail: 'npm install zod@3.23.8' }],
      messages: [
        { id: 1, text: 'Context is at 39%. The agent compacts automatically at 80%.' },
        { id: 2, text: 'Opened C:\\Users\\jonathan\\source\\claude-code-win' }
      ],
      onreview: fn(),
      onopencontrolcentre: fn(),
      onclose: fn()
    },
    argTypes: { onreview: { action: 'review' }, onopencontrolcentre: { action: 'open control centre' }, onclose: { action: 'close' } }
  })
</script>

<Story name="WithApproval">
  {#snippet template(args)}<div class="stage"><ActionCenter {...args} /></div>{/snippet}
</Story>
<Story name="Two" args={{ approvals: [{ key: 'a', title: 'Edit src/auth/redirect.ts', detail: 'Fix login redirect bug' }, { key: 'b', title: 'Run npm test', detail: 'Add parser unit tests' }] }}>
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
