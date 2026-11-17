<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Button from '../../kit/atoms/Button.svelte'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Task Scheduler',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="task-scheduler" width={1000} height={600} />
</Story>

<Story name="HistoryOfATask" asChild>
  <AppStory app="task-scheduler" width={1000} height={600} view={{ app: 'task-scheduler', selectedTaskId: 2, tab: 'history' }} />
</Story>

<Story name="SettingsOfATask" asChild>
  <AppStory app="task-scheduler" width={1000} height={600} view={{ app: 'task-scheduler', selectedTaskId: 2, tab: 'settings' }} />
</Story>

<Story name="RunsAndEnds" asChild>
  <AppStory app="task-scheduler" width={1000} height={600} view={{ app: 'task-scheduler', selectedTaskId: 1, tab: 'history' }}>
    {#snippet extra(host)}
      <Button onclick={() => void host.api.scheduler.run(1)}>Run "Morning review"</Button>
      <Button onclick={() => void host.api.scheduler.end(1)}>End it</Button>
    {/snippet}
  </AppStory>
</Story>
