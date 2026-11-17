<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import InfoPanels from './InfoPanels.svelte'

  const now = new Date(2026, 10, 16, 3, 56)

  const { Story } = defineMeta({
    title: 'Desktop/InfoPanels',
    component: InfoPanels,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      chatTitle: 'Fix login redirect bug',
      contextUsed: 78000,
      contextSize: 200000,
      since: new Date(2026, 10, 16, 3, 14),
      now,
      feed: [
        { key: '1:a', sessionId: 1, toolCallId: 'a', call: { title: 'agentxp.browser_read', kind: 'other', status: 'completed', rawInput: null, locations: [], contents: [] }, cwd: 'E:\\', chatTitle: 'Fix login redirect bug', title: 'Read the page', status: 'completed', count: 24 },
        { key: '1:b', sessionId: 1, toolCallId: 'b', call: { title: 'Edit src/auth/redirect.ts', kind: 'edit', status: 'in_progress', rawInput: null, locations: [{ path: 'E:\\src\\auth\\redirect.ts', line: null }], contents: [] }, cwd: 'E:\\', chatTitle: 'Fix login redirect bug', title: 'Edit src/auth/redirect.ts', status: 'in_progress', count: 1 },
        { key: '2:c', sessionId: 2, toolCallId: 'c', call: { title: 'npm test -- auth', kind: 'execute', status: 'failed', rawInput: null, locations: [], contents: [] }, cwd: 'E:\\', chatTitle: 'Add parser unit tests', title: 'npm test -- auth', status: 'failed', count: 1 }
      ]
    },
    argTypes: { chatTitle: { control: 'text' }, contextUsed: { control: 'number' }, contextSize: { control: 'number' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}<div class="stage"><InfoPanels {...args} /></div>{/snippet}
</Story>
<Story name="NoChat" args={{ chatTitle: null, contextUsed: 0, contextSize: 0, feed: [] }}>
  {#snippet template(args)}<div class="stage"><InfoPanels {...args} /></div>{/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
</style>
