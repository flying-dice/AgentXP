<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Notepad',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory
    app="notepad"
    width={560}
    height={380}
    agent={[
      { label: 'notepad_open package.json', view: { app: 'notepad', path: 'E:\\package.json', dirty: false, caretLine: 3 } },
      { label: 'notepad_open README.md', view: { app: 'notepad', path: 'E:\\README.md', dirty: false, caretLine: 1 } }
    ]}
  />
</Story>

<Story name="Untitled" asChild>
  <AppStory app="notepad" width={560} height={300} view={{ app: 'notepad', path: null, dirty: false, caretLine: 1 }} />
</Story>
