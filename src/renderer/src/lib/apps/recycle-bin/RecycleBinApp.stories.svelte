<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Recycle Bin',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="recycle-bin" width={680} height={460} view={{ app: 'recycle-bin', selectedId: 1 }} />
</Story>
