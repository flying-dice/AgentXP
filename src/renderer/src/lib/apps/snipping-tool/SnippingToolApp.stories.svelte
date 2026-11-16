<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Snipping Tool',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="snipping-tool" width={440} height={260} />
</Story>
