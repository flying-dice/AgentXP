<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import FileTree from './FileTree.svelte'
  import { createFakeApi } from '../fakeApi'
  import { indexGitStatus } from '../../apps/code/gitModel'

  const api = createFakeApi()
  const git = indexGitStatus([
    {
      branch: 'main',
      ahead: 0,
      behind: 0,
      entries: [
        { path: 'E:\\src\\auth\\redirect.ts', index: ' ', worktree: 'M' },
        { path: 'E:\\src\\auth\\session.ts', index: 'A', worktree: ' ' },
        { path: 'E:\\docs\\guide.md', index: '?', worktree: '?' },
        { path: 'E:\\tests\\auth.test.ts', index: ' ', worktree: 'D' },
        { path: 'E:\\package.json', index: 'U', worktree: 'U' },
        { path: 'E:\\README.md', index: 'R', worktree: ' ' }
      ]
    }
  ])

  const { Story } = defineMeta({
    title: 'App/FileTree',
    component: FileTree,
    args: { roots: [{ path: 'E:\\', name: 'claude-code-win (E:)' }], changedPaths: ['E:\\src\\auth\\redirect.ts'], readDir: (path: string) => api.vfs.readDir(1, path) },
    argTypes: { onopen: { action: 'open' } }
  })
</script>

<Story name="GitStatus" args={{ git }}>
  {#snippet template(args)}
    <div class="frame"><FileTree {...args} /></div>
  {/snippet}
</Story>

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
