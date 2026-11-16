<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Task Manager',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="agent-manager" width={700} height={400} />
</Story>
