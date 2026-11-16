<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DataGridView from './DataGridView.svelte'
  import type { GridColumn, GridRow } from './DataGridView'

  const { Story } = defineMeta({
    title: 'Organisms/DataGridView',
    component: DataGridView,
    args: { rowHeaders: true, readOnly: false },
    argTypes: { rowHeaders: { control: 'boolean' }, readOnly: { control: 'boolean' }, oncellchange: { action: 'cellchange' } }
  })

  const columns: GridColumn[] = [
    { key: 'name', header: 'Name', width: 140 },
    { key: 'port', header: 'Port', width: 70, type: 'number' },
    { key: 'proto', header: 'Protocol', width: 90, type: 'combo', options: ['stdio', 'http', 'sse'] },
    { key: 'enabled', header: 'Enabled', width: 64, type: 'checkbox' },
    { key: 'id', header: 'Id', width: 60, readOnly: true }
  ]
  const initial = (): GridRow[] => [
    { id: 1, name: 'filesystem', port: 0, proto: 'stdio', enabled: true },
    { id: 2, name: 'github', port: 8080, proto: 'http', enabled: true },
    { id: 3, name: 'a2ui', port: 0, proto: 'stdio', enabled: false },
    { id: 4, name: 'metrics', port: 9100, proto: 'sse', enabled: true }
  ]
</script>

<script lang="ts">
  let rows = $state(initial())
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:470px;height:200px">
      <DataGridView {...args} {columns} bind:rows />
    </div>
    <p style="font-size:11px;color:#555">Arrows/Tab move; F2, double-click or typing edits; Enter commits, Esc cancels; Space toggles checkboxes.</p>
  {/snippet}
</Story>

<Story name="ReadOnly" args={{ readOnly: true }}>
  {#snippet template(args)}
    <div style="width:470px;height:160px">
      <DataGridView {...args} {columns} rows={initial()} />
    </div>
  {/snippet}
</Story>

<Story name="NoRowHeaders" args={{ rowHeaders: false }}>
  {#snippet template(args)}
    <div style="width:470px;height:160px">
      <DataGridView {...args} {columns} rows={initial()} />
    </div>
  {/snippet}
</Story>
