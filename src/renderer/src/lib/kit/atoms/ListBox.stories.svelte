<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ListBox from './ListBox.svelte'

  const fruit = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine'].map((f) => ({
    value: f.toLowerCase(),
    label: f
  }))
  const withDisabled = fruit.map((f, i) => ({ ...f, disabled: i === 2 || i === 5 }))

  const { Story } = defineMeta({
    title: 'Atoms/ListBox',
    component: ListBox,
    argTypes: {
      selectionMode: { control: 'inline-radio', options: ['One', 'MultiSimple', 'MultiExtended'] },
      disabled: { control: 'boolean' },
      width: { control: 'number' },
      height: { control: 'number' }
    },
    args: { items: fruit, selectionMode: 'One', disabled: false, width: 180, height: 120 }
  })
</script>

<script lang="ts">
  let sel = $state(['banana'])
</script>

<Story name="Default" />
<Story name="Multi simple (click toggles)" args={{ selectionMode: 'MultiSimple' }} />
<Story name="Multi extended (Ctrl/Shift)" args={{ selectionMode: 'MultiExtended' }} />
<Story name="Disabled items" args={{ items: withDisabled }} />
<Story name="Disabled" args={{ disabled: true }} />

<Story name="Bound selection">
  <div style="display:flex;gap:12px;align-items:flex-start">
    <ListBox items={fruit} selectionMode="MultiExtended" bind:selected={sel} />
    <div>Selected: {sel.join(', ') || '(none)'}</div>
  </div>
</Story>
