<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import SessionTree from './SessionTree.svelte'
  import { sampleFolders, sampleSessions } from '../fakeApi'

  const { Story } = defineMeta({
    title: 'App/SessionTree',
    component: SessionTree,
    args: { folders: sampleFolders, sessions: sampleSessions, activeSessionId: 1 },
    argTypes: {
      activeSessionId: { control: 'number' },
      onselectsession: { action: 'selectsession' },
      onselectfolder: { action: 'selectfolder' },
      onnewsession: { action: 'newsession' },
      onrename: { action: 'rename' },
      ondelete: { action: 'delete' },
      onremovefolder: { action: 'removefolder' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="frame"><SessionTree {...args} /></div>
  {/snippet}
</Story>

<Story name="NoFolders" args={{ folders: [], sessions: [], activeSessionId: null }}>
  {#snippet template(args)}
    <div class="frame"><SessionTree {...args} /></div>
  {/snippet}
</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    width: 250px;
    height: 320px;
    border: 1px solid var(--w7-panel-border);
    background: var(--w7-window);
  }
</style>
