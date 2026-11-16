<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import GroupBox from './GroupBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/GroupBox',
    component: GroupBox,
    argTypes: { text: { control: 'text' }, disabled: { control: 'boolean' } },
    args: { text: 'Options', disabled: false }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <GroupBox {...args} class="demo">
      <div style="width:220px;height:60px">Content goes here.</div>
    </GroupBox>
  {/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
  {#snippet template(args)}
    <GroupBox {...args}><div style="width:220px;height:40px">Disabled group.</div></GroupBox>
  {/snippet}
</Story>

<Story name="Without caption" args={{ text: '' }}>
  {#snippet template(args)}
    <GroupBox {...args}><div style="width:220px;height:40px">No caption.</div></GroupBox>
  {/snippet}
</Story>

<Story name="Nested">
  <GroupBox text="Outer">
    <GroupBox text="Inner"><div style="width:180px;height:30px">Nested content</div></GroupBox>
  </GroupBox>
</Story>
