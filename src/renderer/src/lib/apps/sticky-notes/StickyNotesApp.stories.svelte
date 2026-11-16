<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Sticky Notes',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Manager" asChild>
  <AppStory app="sticky-notes" width={380} height={400} />
</Story>
