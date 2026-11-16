<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import OptionsDialog from './OptionsDialog.svelte'
  import AgentEditDialog from './AgentEditDialog.svelte'
  import MessageBoxHost from '../../kit/organisms/MessageBoxHost.svelte'
  import { AgentsStore } from '../../stores/AgentsStore.svelte'
  import { createFakeApi } from '../fakeApi'

  const { Story } = defineMeta({
    title: 'App/OptionsDialog',
    component: OptionsDialog,
    parameters: { layout: 'fullscreen' },
    args: { initialTab: 'general', addAgent: false },
    argTypes: { initialTab: { control: 'inline-radio', options: ['general', 'agents'] }, addAgent: { control: 'boolean' }, onclose: { action: 'close' }, onerror: { action: 'error' } }
  })

  const store = async (): Promise<AgentsStore> => {
    const agents = new AgentsStore(createFakeApi().agents)
    await agents.load()
    return agents
  }
</script>

<Story name="General" asChild>
  {#await store() then agents}<OptionsDialog {agents} /><MessageBoxHost />{/await}
</Story>

<Story name="Agents" asChild>
  {#await store() then agents}<OptionsDialog {agents} initialTab="agents" /><MessageBoxHost />{/await}
</Story>

<Story name="AddAgentForm" asChild>
  <AgentEditDialog title="Add Agent" />
</Story>

<Story name="EditAgentForm" asChild>
  <AgentEditDialog title="Edit Agent" initial={{ name: 'Gemini CLI', command: 'gemini', args: '--experimental-acp', env: 'GEMINI_API_KEY=example' }} />
</Story>
