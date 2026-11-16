<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import { settingsForm, testResults } from '../../a2ui/A2uiSurface.fixtures'
  import A2uiActivity from './A2uiActivity.svelte'

  const { Story } = defineMeta({
    title: 'App/Session/A2uiActivity',
    component: A2uiActivity,
    args: { messages: testResults, sessionId: 1, onaction: fn() },
    argTypes: { onaction: { action: 'action' } }
  })
</script>

<Story name="TestResults">
  {#snippet template(args)}<div style="width:560px;padding:8px;background:#fff"><A2uiActivity {...args} /></div>{/snippet}
</Story>

<Story name="SettingsForm" args={{ messages: settingsForm }}>
  {#snippet template(args)}<div style="width:560px;padding:8px;background:#fff"><A2uiActivity {...args} /></div>{/snippet}
</Story>
