<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ListView from './ListView.svelte'
  import type { ListColumn, ListRow } from './ListView'

  const { Story } = defineMeta({
    title: 'Organisms/ListView',
    component: ListView,
    args: { view: 'Details', multiSelect: false, emptyText: 'No pending changes in this session.' },
    argTypes: {
      view: { control: 'inline-radio', options: ['Details', 'List', 'SmallIcon', 'LargeIcon'] },
      multiSelect: { control: 'boolean' },
      onselect: { action: 'select' },
      onactivate: { action: 'activate' }
    }
  })

  const columns: ListColumn[] = [
    { key: 'path', header: 'File' },
    { key: 'kind', header: 'Change', width: 68 },
    { key: 'lines', header: 'Lines', width: 62, align: 'right' }
  ]
  const rows = (): ListRow[] => [
    { id: '1', icon: 'file-code', path: 'src/auth/redirect.ts', kind: 'Modified', lines: 12 },
    { id: '2', icon: 'file-code', path: 'src/auth/session.ts', kind: 'Modified', lines: 4 },
    { id: '3', icon: 'file-text', path: 'docs/login.md', kind: 'Added', lines: 31 },
    { id: '4', icon: 'file', path: 'old/legacy.js', kind: 'Deleted', lines: 120 },
    { id: '5', icon: 'file-code', path: 'test/redirect.test.ts', kind: 'Added', lines: 58 }
  ]
</script>

<script lang="ts">
  let selected = $state<string[]>(['2'])
  let multi = $state<string[]>(['1', '3'])
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:400px;height:180px">
      <ListView {...args} {columns} rows={rows()} bind:selected />
    </div>
  {/snippet}
</Story>

<Story name="MultiSelect" args={{ multiSelect: true }}>
  {#snippet template(args)}
    <div style="width:400px;height:180px">
      <ListView {...args} {columns} rows={rows()} bind:selected={multi} />
    </div>
    <p style="font-size:11px;color:#555">Ctrl/Shift click, Shift+arrows, Ctrl+A. Click a header to sort; drag its edge to resize.</p>
  {/snippet}
</Story>

<Story name="Empty">
  {#snippet template(args)}
    <div style="width:400px;height:124px">
      <ListView {...args} {columns} rows={[]} />
    </div>
  {/snippet}
</Story>

<Story name="List" args={{ view: 'List' }}>
  {#snippet template(args)}
    <div style="width:400px;height:90px">
      <ListView {...args} {columns} rows={rows()} selected={['3']} />
    </div>
  {/snippet}
</Story>

<Story name="SmallIcon" args={{ view: 'SmallIcon' }}>
  {#snippet template(args)}
    <div style="width:400px;height:120px">
      <ListView {...args} {columns} rows={rows()} selected={['3']} />
    </div>
  {/snippet}
</Story>

<Story name="LargeIcon" args={{ view: 'LargeIcon' }}>
  {#snippet template(args)}
    <div style="width:400px;height:200px">
      <ListView {...args} {columns} rows={rows()} selected={['3']} />
    </div>
  {/snippet}
</Story>
