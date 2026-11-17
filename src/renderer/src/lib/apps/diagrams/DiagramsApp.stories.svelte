<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'
  import { DEMO_CLASSES, DEMO_ERD, DEMO_FLOW } from './diagramsDemo'

  const { Story } = defineMeta({
    title: 'Apps/Agent Diagrams',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Blank" asChild>
  <AppStory
    app="diagrams"
    width={1180}
    height={760}
    requests={[
      { label: 'diagram_add: a flowchart', method: 'add', params: DEMO_FLOW },
      { label: 'diagram_add: UML classes', method: 'add', params: DEMO_CLASSES },
      { label: 'diagram_pages add', method: 'pages', params: { action: 'add', name: 'Data model' } },
      { label: 'diagram_add: an ER diagram', method: 'add', params: DEMO_ERD },
      { label: 'diagram_layout LR', method: 'layout', params: { direction: 'LR' } },
      { label: 'diagram_read', method: 'read' }
    ]}
  />
</Story>

<Story name="AgentDrew" asChild>
  <AppStory app="diagrams" width={1180} height={760} run={[{ method: 'add', params: DEMO_FLOW }, { method: 'add', params: DEMO_CLASSES }, { method: 'select', params: { ids: [] } }]} />
</Story>

<Story name="DataModel" asChild>
  <AppStory app="diagrams" width={1180} height={760} run={[{ method: 'add', params: DEMO_ERD }, { method: 'select', params: { ids: ['s2'] } }]} />
</Story>
