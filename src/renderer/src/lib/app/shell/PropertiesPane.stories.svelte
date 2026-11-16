<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import PropertiesPane from './PropertiesPane.svelte'
  import { sampleAgents, sampleFolders, sampleSessions } from '../fakeApi'

  const { Story } = defineMeta({
    title: 'App/PropertiesPane',
    component: PropertiesPane,
    args: { session: sampleSessions[0], folder: sampleFolders[0], agent: sampleAgents[0] },
    argTypes: { ontitle: { action: 'title' }, onmode: { action: 'mode' }, onmodel: { action: 'model' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="frame"><PropertiesPane {...args} /></div>
  {/snippet}
</Story>

<Story name="WithoutModes" args={{ session: { ...sampleSessions[0], modes: [], models: [], acpSessionId: null, status: 'connecting' } }}>
  {#snippet template(args)}
    <div class="frame"><PropertiesPane {...args} /></div>
  {/snippet}
</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    width: 330px;
    height: 420px;
    border: 1px solid var(--w7-panel-border);
    background: var(--w7-window);
  }
</style>
