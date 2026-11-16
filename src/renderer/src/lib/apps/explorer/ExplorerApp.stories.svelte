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
      { label: 'explorer_open src', view: { app: 'explorer', path: 'E:\\src', selected: ['E:\\src\\index.ts'] } },
      { label: 'explorer_open Computer', view: { app: 'explorer', path: '', selected: [] } }
    ]}
  />
</Story>

<Story name="ProjectRoot" asChild>
  <AppStory app="explorer" width={680} height={380} view={{ app: 'explorer', path: 'E:\\', selected: [] }} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<Story name="Computer" asChild>
  <AppStory app="explorer" width={680} height={380} view={{ app: 'explorer', path: '', selected: ['E:\\'] }} />
</Story>

<Story name="ComputerTwoUsbDrives" asChild>
  <AppStory
    app="explorer"
    width={680}
    height={380}
    view={{ app: 'explorer', path: '', selected: ['F:\\'] }}
    setup={(host) => void host.api.drives.plugIn(host.state.desktopId, 2)}
  />
</Story>

<Story name="HomeFolder" asChild>
  <AppStory app="explorer" width={680} height={380} view={{ app: 'explorer', path: 'C:\\Users\\Agent', selected: [] }} />
</Story>
