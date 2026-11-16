<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Browser',
    parameters: { layout: 'fullscreen' }
  })
</script>

<Story name="Default" asChild>
  <AppStory
    app="browser"
    width={820}
    height={480}
    agent={[
      { label: 'browser_navigate svelte.dev', view: { app: 'browser', url: 'https://svelte.dev/docs', title: '', loading: false } },
      { label: 'browser_navigate localhost:5173', view: { app: 'browser', url: 'http://localhost:5173/', title: '', loading: false } }
    ]}
  />
</Story>

<Story name="Blank" asChild>
  <AppStory app="browser" width={820} height={360} view={{ app: 'browser', url: 'about:blank', title: '', loading: false }} />
</Story>

<Story name="Tabs" asChild>
  <AppStory
    app="browser"
    width={820}
    height={420}
    view={{ app: 'browser', url: 'https://example.com/', title: '', loading: false }}
    requests={[
      { label: 'browser_tabs new', method: 'tabs', params: { action: 'new', url: 'https://svelte.dev/' } },
      { label: 'browser_tabs switch 1', method: 'tabs', params: { action: 'switch', tab: 1 } },
      { label: 'browser_tabs close', method: 'tabs', params: { action: 'close' } }
    ]}
    run={[
      { method: 'tabs', params: { action: 'new', url: 'https://svelte.dev/docs' } },
      { method: 'tabs', params: { action: 'new' } }
    ]}
  />
</Story>

<Story name="AgentIsUsingThePage" asChild>
  <AppStory
    app="browser"
    width={820}
    height={420}
    view={{ app: 'browser', url: 'https://example.com/', title: '', loading: false }}
    requests={[{ label: 'browser_click (ring)', method: 'activity', params: { label: 'Clicking [3]', box: { x: 300, y: 140, width: 160, height: 28 } } }]}
    run={[{ method: 'activity', params: { label: 'Clicking [3]', box: { x: 300, y: 140, width: 160, height: 28 } } }]}
  />
</Story>
