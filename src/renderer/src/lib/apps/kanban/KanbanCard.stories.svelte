<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import KanbanCard from './KanbanCard.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Kanban/Card',
    component: KanbanCard,
    argTypes: { selected: { control: 'boolean' }, dragging: { control: 'boolean' } }
  })

  const card = { id: 1, columnId: 1, title: 'Fix the login redirect', description: 'Keep the ?next= parameter when the session expired.\nAdd a test.', assignee: 'Claude Code' }
</script>

<Story name="Default" args={{ card }} asChild>
  <div style="width: 220px; padding: 12px; background: #dfe6ef"><KanbanCard {card} /></div>
</Story>

<Story name="Selected" asChild>
  <div style="width: 220px; padding: 12px; background: #dfe6ef"><KanbanCard {card} selected /></div>
</Story>

<Story name="Dragging" asChild>
  <div style="width: 220px; padding: 12px; background: #dfe6ef"><KanbanCard {card} dragging /></div>
</Story>

<Story name="Title only" asChild>
  <div style="width: 220px; padding: 12px; background: #dfe6ef"><KanbanCard card={{ ...card, description: '', assignee: null }} /></div>
</Story>

<Story name="Long title" asChild>
  <div style="width: 220px; padding: 12px; background: #dfe6ef">
    <KanbanCard card={{ ...card, title: 'A very long title that has to wrap onto a second line instead of running out of the column', assignee: 'Documentation agent' }} />
  </div>
</Story>
