<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import PropertyRow from './PropertyRow.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/PropertyRow',
    component: PropertyRow,
    args: { name: 'Text', value: 'Hello', nameWidth: 130, selected: false, readOnly: false },
    argTypes: {
      nameWidth: { control: { type: 'number', min: 40, max: 300 } },
      selected: { control: 'boolean' },
      readOnly: { control: 'boolean' },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:320px;border:1px solid #828790"><PropertyRow {...args} /></div>
  {/snippet}
</Story>

<Story name="Selected" args={{ selected: true }}>
  {#snippet template(args)}
    <div style="width:320px;border:1px solid #828790"><PropertyRow {...args} /></div>
  {/snippet}
</Story>

<Story name="ReadOnly" args={{ readOnly: true, name: 'Id', value: '42' }}>
  {#snippet template(args)}
    <div style="width:320px;border:1px solid #828790"><PropertyRow {...args} /></div>
  {/snippet}
</Story>

<Story name="Rows" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="width:320px;border:1px solid #828790">
      <PropertyRow name="Name" value="okButton" />
      <PropertyRow name="Enabled" value="True" selected />
      <PropertyRow name="Tag" value="" />
      <PropertyRow name="Handle" value="0x0042" readOnly />
    </div>
  {/snippet}
</Story>
