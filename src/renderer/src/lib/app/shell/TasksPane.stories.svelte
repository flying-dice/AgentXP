<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import TasksPane from './TasksPane.svelte'
  import { sampleTasks } from '../fakeApi'

  const { Story } = defineMeta({ title: 'App/TasksPane', component: TasksPane, args: { tasks: sampleTasks } })
</script>

{#snippet frame(args: ComponentProps<typeof TasksPane>)}
  <div class="frame"><TasksPane {...args} /></div>
{/snippet}

<Story name="InProgress">{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="Empty" args={{ tasks: [] }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="AllDone" args={{ tasks: sampleTasks.map((t) => ({ ...t, status: 'completed' })) }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    width: 330px;
    height: 300px;
    border: 1px solid var(--xp-panel-border);
    background: var(--xp-window);
  }
</style>
