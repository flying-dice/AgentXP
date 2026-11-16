<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import CheckedListBox from './CheckedListBox.svelte'

  const items = ['Show hidden files', 'Show extensions', 'Compact view', 'Preview pane', 'Details pane', 'Navigation pane'].map((l) => ({
    value: l,
    label: l
  }))

  const { Story } = defineMeta({
    title: 'Atoms/CheckedListBox',
    component: CheckedListBox,
    argTypes: { disabled: { control: 'boolean' }, width: { control: 'number' }, height: { control: 'number' } },
    args: { items, checked: ['Show extensions'], disabled: false, width: 200, height: 120 }
  })
</script>

<script lang="ts">
  let checked = $state(['Compact view', 'Preview pane'])
</script>

<Story name="Default" />
<Story name="Disabled" args={{ disabled: true, checked: ['Compact view'] }} />
<Story name="Some items disabled" args={{ items: items.map((i, n) => ({ ...i, disabled: n % 3 === 0 })) }} />

<Story name="Bound">
  <div style="display:flex;gap:12px;align-items:flex-start">
    <CheckedListBox {items} bind:checked />
    <div>Checked: {checked.join(', ') || '(none)'}</div>
  </div>
</Story>
