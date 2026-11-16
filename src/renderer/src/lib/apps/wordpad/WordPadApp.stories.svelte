<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/WordPad',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Read" asChild>
  <AppStory
    app="wordpad"
    width={720}
    height={500}
    view={{ app: 'wordpad', path: 'README.md', mode: 'read', dirty: false, visibleHeading: null }}
    agent={[
      { label: 'wordpad_open docs', view: { app: 'wordpad', path: 'docs/guide.md', mode: 'read', dirty: false, visibleHeading: null } },
      { label: 'edit mode', view: { app: 'wordpad', path: 'README.md', mode: 'edit', dirty: false, visibleHeading: null } }
    ]}
    requests={[{ label: 'wordpad_read', method: 'read' }]}
  />
</Story>

<Story name="Edit" asChild>
  <AppStory app="wordpad" width={720} height={500} view={{ app: 'wordpad', path: 'README.md', mode: 'edit', dirty: false, visibleHeading: null }} />
</Story>

<Story name="Empty" asChild>
  <AppStory app="wordpad" width={720} height={360} view={{ app: 'wordpad', path: null, mode: 'read', dirty: false, visibleHeading: null }} />
</Story>
