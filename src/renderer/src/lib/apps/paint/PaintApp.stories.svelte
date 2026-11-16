<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'
  import { houseScene } from './paintDemo'

  const { Story } = defineMeta({
    title: 'Apps/Agent Paint',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Blank" asChild>
  <AppStory
    app="paint"
    width={880}
    height={620}
    requests={[
      { label: 'paint_draw: a house', method: 'draw', params: { ops: houseScene } },
      { label: 'paint_clear', method: 'draw', params: { ops: [{ type: 'clear' }] } },
      { label: 'paint_resize 600x400', method: 'resize', params: { width: 600, height: 400 } },
      { label: 'paint_read', method: 'read' }
    ]}
  />
</Story>

<Story name="AgentDrew" asChild>
  <AppStory app="paint" width={880} height={620} run={[{ method: 'draw', params: { ops: houseScene } }]} />
</Story>
