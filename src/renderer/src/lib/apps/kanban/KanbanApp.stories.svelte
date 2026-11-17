<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Kanban',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Board" asChild>
  <AppStory app="kanban" width={820} height={440} />
</Story>
