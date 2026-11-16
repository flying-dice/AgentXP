<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Chat',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="chat" width={700} height={540} />
</Story>

<Story name="Narrow" asChild>
  <AppStory app="chat" width={460} height={540} />
</Story>
