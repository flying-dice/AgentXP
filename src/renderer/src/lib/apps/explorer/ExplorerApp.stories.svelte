<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'
  import { sampleChatView } from '../storyHost.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Explorer',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory
    app="explorer"
    width={680}
    height={380}
    setup={(host) => host.open({ app: 'chat' }, sampleChatView())}
    agent={[
      { label: 'explorer_open src', view: { app: 'explorer', path: 'src', selected: ['src/index.ts'] } },
      { label: 'explorer_open workspace', view: { app: 'explorer', path: '', selected: [] } }
    ]}
  />
</Story>

<Story name="Workspace root" asChild>
  <AppStory app="explorer" width={680} height={380} view={{ app: 'explorer', path: '', selected: [] }} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>
