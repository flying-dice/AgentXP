<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TreeView from './TreeView.svelte'
  import type { TreeNodeData } from './TreeView'

  const { Story } = defineMeta({
    title: 'Organisms/TreeView',
    component: TreeView,
    args: { showLines: false },
    argTypes: { showLines: { control: 'boolean' }, onselect: { action: 'select' }, onactivate: { action: 'activate' } }
  })

  const sessions = (): TreeNodeData[] => [
    {
      id: 'ws',
      text: 'Workspaces',
      icon: 'folder',
      expanded: true,
      children: [
        {
          id: 'ccw',
          text: 'claude-code-win',
          icon: 'folder',
          expanded: true,
          children: [
            { id: 's1', text: 'Fix login redirect bug', icon: 'session' },
            { id: 's2', text: 'Add parser unit tests', icon: 'session' },
            { id: 's3', text: 'Refactor config loader', icon: 'session' }
          ]
        },
        { id: 'dot', text: 'dotfiles', icon: 'folder', children: [{ id: 's4', text: 'Shell setup', icon: 'session' }] }
      ]
    }
  ]

  /** Fake file system for lazy loading. */
  const fs: Record<string, TreeNodeData[]> = {
    root: [
      { id: 'src', text: 'src', icon: 'folder', hasChildren: true },
      { id: 'docs', text: 'docs', icon: 'folder', hasChildren: true },
      { id: 'empty', text: 'empty', icon: 'folder', hasChildren: true },
      { id: 'readme', text: 'README.md', icon: 'file-text' }
    ],
    src: [
      { id: 'src/main', text: 'main', icon: 'folder', hasChildren: true },
      { id: 'src/index.ts', text: 'index.ts', icon: 'file-code' }
    ],
    'src/main': [{ id: 'src/main/app.ts', text: 'app.ts', icon: 'file-code' }],
    docs: [{ id: 'docs/a.md', text: 'ARCHITECTURE.md', icon: 'file-text' }]
  }
  const loadChildren = async (node: TreeNodeData): Promise<TreeNodeData[]> => {
    await new Promise((r) => setTimeout(r, 700))
    return fs[node.id] ?? []
  }
</script>

<script lang="ts">
  let selected = $state<string | null>('s1')
  let expanded = $state(new Set<string>())
  let lazySelected = $state<string | null>(null)
  let lazyExpanded = $state(new Set<string>())
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:250px;height:240px">
      <TreeView {...args} nodes={sessions()} bind:selected bind:expanded />
    </div>
    <p style="font-size:11px;color:#555">Selected: {selected} - Up/Down/Left/Right/Home/End/Enter and type-ahead.</p>
  {/snippet}
</Story>

<Story name="ShowLines" args={{ showLines: true }}>
  {#snippet template(args)}
    <div style="width:250px;height:240px">
      <TreeView {...args} nodes={sessions()} selected="s2" />
    </div>
  {/snippet}
</Story>

<Story name="LazyFileTree">
  {#snippet template(args)}
    <div style="width:250px;height:240px">
      <TreeView {...args} nodes={fs.root} bind:selected={lazySelected} bind:expanded={lazyExpanded} onexpand={loadChildren} />
    </div>
    <p style="font-size:11px;color:#555">Children load on first expand (700 ms delay).</p>
  {/snippet}
</Story>
