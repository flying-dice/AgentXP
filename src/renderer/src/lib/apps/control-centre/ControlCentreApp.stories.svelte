<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Control Center',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Agents" asChild>
  <AppStory app="control-centre" width={700} height={440} view={{ app: 'control-centre', page: 'agents' }} />
</Story>

<Story name="Permissions" asChild>
  <AppStory app="control-centre" width={700} height={440} view={{ app: 'control-centre', page: 'permissions' }} />
</Story>

<Story name="Appearance" asChild>
  <AppStory app="control-centre" width={700} height={380} view={{ app: 'control-centre', page: 'appearance' }} />
</Story>

<Story name="About" asChild>
  <AppStory app="control-centre" width={700} height={340} view={{ app: 'control-centre', page: 'about' }} />
</Story>

<Story name="Skills and MCP" asChild>
  <AppStory app="control-centre" width={760} height={600} view={{ app: 'control-centre', page: 'skills' }} />
</Story>
