<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Help and Support',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Home" asChild>
  <AppStory app="help" width={820} height={560} view={{ app: 'help', topic: 'index' }} />
</Story>

<Story name="Notepad topic" asChild>
  <AppStory app="help" width={820} height={560} view={{ app: 'help', topic: 'notepad' }} />
</Story>
