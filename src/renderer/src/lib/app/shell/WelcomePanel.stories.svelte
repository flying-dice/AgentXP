<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import WelcomePanel from './WelcomePanel.svelte'

  const { Story } = defineMeta({
    title: 'App/WelcomePanel',
    component: WelcomePanel,
    parameters: { layout: 'fullscreen' },
    args: { hasFolders: false },
    argTypes: { hasFolders: { control: 'boolean' }, onopenfolder: { action: 'openfolder' }, onnewsession: { action: 'newsession' }, onaddagent: { action: 'addagent' } }
  })
</script>

<Story name="NoFolders">
  {#snippet template(args)}
    <div class="frame"><WelcomePanel {...args} /></div>
  {/snippet}
</Story>

<Story name="FoldersWithoutSession" args={{ hasFolders: true }}>
  {#snippet template(args)}
    <div class="frame"><WelcomePanel {...args} /></div>
  {/snippet}
</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
</style>
