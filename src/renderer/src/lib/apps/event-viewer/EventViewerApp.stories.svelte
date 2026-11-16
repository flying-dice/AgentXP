<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Button from '../../kit/atoms/Button.svelte'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Event Viewer',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory app="event-viewer" width={900} height={540}>
    {#snippet extra(host)}
      <Button onclick={() => host.fake.pushEvent({ desktopId: 1, sessionId: 1, source: 'ag-ui', direction: 'out', level: 'info', name: 'TEXT_MESSAGE_CONTENT', payload: JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'Hello' }, null, 2) })}>Push AG-UI event</Button>
      <Button onclick={() => host.fake.pushEvent({ desktopId: 1, sessionId: 2, source: 'acp', direction: 'in', level: 'error', name: 'session/prompt', payload: JSON.stringify({ error: { code: -32603, message: 'Agent process exited' } }, null, 2) })}>Push error</Button>
    {/snippet}
  </AppStory>
</Story>

<Story name="ErrorSelected" asChild>
  <AppStory app="event-viewer" width={900} height={540} view={{ app: 'event-viewer', sessionId: null, level: 'all', selectedEventId: 9 }} />
</Story>
