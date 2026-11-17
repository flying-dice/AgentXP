<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TaskPanes from './TaskPanes.svelte'

  const now = new Date(2026, 10, 16, 3, 56)

  const { Story } = defineMeta({
    title: 'Desktop/TaskPanes',
    component: TaskPanes,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      chatTitle: 'Fix login redirect bug',
      contextUsed: 78000,
      contextSize: 200000,
      since: new Date(2026, 10, 16, 3, 14),
      now,
      feed: [
        { key: '1', chatTitle: 'Fix login redirect bug', title: 'Read the page', status: 'completed', count: 24 },
        { key: '2', chatTitle: 'Fix login redirect bug', title: 'Edit src/auth/redirect.ts', status: 'in_progress', count: 1 },
        { key: '3', chatTitle: 'Add parser unit tests', title: 'npm test -- auth', status: 'failed', count: 1 }
      ]
    },
    argTypes: { chatTitle: { control: 'text' }, contextUsed: { control: 'number' }, contextSize: { control: 'number' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><TaskPanes {...args} /></div>{/snippet}
</Story>
<Story name="NoChat" args={{ chatTitle: null, contextUsed: 0, contextSize: 0, feed: [] }}>
  {#snippet template(args)}<div class="stage"><TaskPanes {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
</style>
