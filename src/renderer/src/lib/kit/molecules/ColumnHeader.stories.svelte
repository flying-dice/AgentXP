<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ColumnHeader from './ColumnHeader.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/ColumnHeader',
    component: ColumnHeader,
    args: { text: 'Name', width: 160, sortable: true, sortDirection: 'none', resizable: true },
    argTypes: {
      sortDirection: { control: 'inline-radio', options: ['none', 'asc', 'desc'] },
      sortable: { control: 'boolean' },
      resizable: { control: 'boolean' },
      align: { control: 'inline-radio', options: ['left', 'right', 'center'] },
      onsort: { action: 'sort' },
      onresize: { action: 'resize' }
    }
  })
</script>

<script lang="ts">
  let width = $state(160)
  let direction = $state<'none' | 'asc' | 'desc'>('asc')
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="display:flex"><ColumnHeader {...args} /></div>
  {/snippet}
</Story>

<Story name="Sorted" args={{ sortDirection: 'asc' }}>
  {#snippet template(args)}
    <div style="display:flex"><ColumnHeader {...args} /><ColumnHeader text="Size" width={80} sortDirection="desc" sortable /></div>
  {/snippet}
</Story>

<Story name="Interactive" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="display:flex;width:420px;border-bottom:1px solid #d5d5d5">
      <ColumnHeader text="File" {width} resizable sortable sortDirection={direction} onresize={(w) => (width = w)} onsort={() => (direction = direction === 'asc' ? 'desc' : 'asc')} />
      <ColumnHeader text="Change" width={68} />
      <ColumnHeader text="Lines" divider={false} />
    </div>
    <p style="font-size:11px;color:#555">Drag the edge of "File" to resize (or Ctrl+Left/Right while focused); click to sort.</p>
  {/snippet}
</Story>

<Story name="Static" args={{ sortable: false, resizable: false }}>
  {#snippet template(args)}
    <div style="display:flex"><ColumnHeader {...args} /></div>
  {/snippet}
</Story>
