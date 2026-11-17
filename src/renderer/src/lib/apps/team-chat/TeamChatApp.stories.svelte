<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Team Chat',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Room" asChild>
  <AppStory
    app="team-chat"
    width={860}
    height={480}
    view={{ app: 'team-chat', roomId: 1, title: 'Team Chat' }}
  />
</Story>
