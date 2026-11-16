<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Browser',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory
    app="browser"
    width={820}
    height={480}
    agent={[
      { label: 'browser_navigate svelte.dev', view: { app: 'browser', url: 'https://svelte.dev/docs', title: '', loading: false } },
      { label: 'browser_navigate localhost:5173', view: { app: 'browser', url: 'http://localhost:5173/', title: '', loading: false } }
    ]}
  />
</Story>

<Story name="Blank" asChild>
  <AppStory app="browser" width={820} height={360} view={{ app: 'browser', url: 'about:blank', title: '', loading: false }} />
</Story>
