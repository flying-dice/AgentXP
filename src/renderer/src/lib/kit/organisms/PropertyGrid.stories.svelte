<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import PropertyGrid from './PropertyGrid.svelte'
  import type { PropertyDef } from './PropertyGrid'

  const { Story } = defineMeta({
    title: 'Organisms/PropertyGrid',
    component: PropertyGrid,
    args: { sort: 'categorized', showDescription: true },
    argTypes: { sort: { control: 'inline-radio', options: ['categorized', 'alphabetical'] }, showDescription: { control: 'boolean' }, onchange: { action: 'change' } }
  })

  const properties: PropertyDef[] = [
    { key: 'name', name: '(Name)', category: 'Design', description: 'The name used in code to identify the object.' },
    { key: 'text', name: 'Text', category: 'Appearance', description: 'The text associated with the control.' },
    { key: 'backColor', name: 'BackColor', category: 'Appearance', description: 'The background color used to display text and graphics in the control.' },
    { key: 'dock', name: 'Dock', category: 'Layout', type: 'enum', options: ['None', 'Top', 'Bottom', 'Left', 'Right', 'Fill'], description: 'Defines which borders of the control are bound to its container.' },
    { key: 'width', name: 'Width', category: 'Layout', type: 'number', description: 'Width of the control in pixels.' },
    { key: 'enabled', name: 'Enabled', category: 'Behavior', type: 'boolean', description: 'Indicates whether the control can respond to user interaction.' },
    { key: 'handle', name: 'Handle', category: 'Misc', readOnly: true, description: 'Window handle (read-only).' }
  ]
  const initialValues = (): Record<string, unknown> => ({ name: 'okButton', text: 'OK', backColor: 'Control', dock: 'None', width: 75, enabled: true, handle: '0x00420A' })
</script>

<script lang="ts">
  let values = $state(initialValues())
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:320px;height:340px">
      <PropertyGrid {...args} {properties} bind:values selectedKey="text" />
    </div>
    <p style="font-size:11px;color:#555">{JSON.stringify(values)}</p>
  {/snippet}
</Story>

<Story name="Alphabetical" args={{ sort: 'alphabetical' }}>
  {#snippet template(args)}
    <div style="width:320px;height:340px">
      <PropertyGrid {...args} {properties} values={initialValues()} selectedKey="dock" />
    </div>
  {/snippet}
</Story>
