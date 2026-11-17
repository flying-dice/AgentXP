<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Teams',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Teams" asChild>
  <AppStory app="teams" width={760} height={420} view={{ app: 'teams', tab: 'teams' }} />
</Story>

<Story name="Profiles" asChild>
  <AppStory app="teams" width={760} height={420} view={{ app: 'teams', tab: 'profiles' }} />
</Story>

<Story name="Chat rooms" asChild>
  <AppStory app="teams" width={760} height={420} view={{ app: 'teams', tab: 'rooms' }} />
</Story>
