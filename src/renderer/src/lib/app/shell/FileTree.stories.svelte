<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import FileTree from './FileTree.svelte'
  import { createFakeApi } from '../fakeApi'

  const api = createFakeApi()

  const { Story } = defineMeta({
    title: 'App/FileTree',
    component: FileTree,
    args: { rootName: 'claude-code-win', changedPaths: ['src/auth/redirect.ts'], readDir: (path: string) => api.folders.readDir(1, path) },
    argTypes: { onopen: { action: 'open' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="frame"><FileTree {...args} /></div>
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
