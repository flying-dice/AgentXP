<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TaskPane from './TaskPane.svelte'
  import TaskPaneSection from '../molecules/TaskPaneSection.svelte'
  import TaskPaneLink from '../molecules/TaskPaneLink.svelte'

  const { Story } = defineMeta({ title: 'Organisms/TaskPane', component: TaskPane, parameters: { layout: 'padded' } })
</script>

<Story name="Default" asChild>
  <div style="width:200px;height:420px">
    <TaskPane>
      <TaskPaneSection title="Scheduled Task Tasks">
        <TaskPaneLink icon="new" label="Create Basic Task..." />
        <TaskPaneLink icon="scheduler" label="Create Task..." />
        <TaskPaneLink icon="refresh" label="Refresh" />
      </TaskPaneSection>
      <TaskPaneSection title="Selected Task">
        <TaskPaneLink icon="play" label="Run" />
        <TaskPaneLink icon="stop" label="End" disabled />
        <TaskPaneLink icon="delete" label="Delete" disabled />
      </TaskPaneSection>
      <TaskPaneSection title="Details" collapsible={false}>
        <strong>Morning review</strong>
        <span>Status: Ready</span>
      </TaskPaneSection>
    </TaskPane>
  </div>
</Story>

<Story name="CollapsedSection" asChild>
  <div style="width:200px;height:220px">
    <TaskPane>
      <TaskPaneSection title="Other Places" collapsed>
        <TaskPaneLink label="Event Viewer" />
      </TaskPaneSection>
      <TaskPaneSection title="Selected Task">
        <TaskPaneLink icon="play" label="Run" />
      </TaskPaneSection>
    </TaskPane>
  </div>
</Story>
