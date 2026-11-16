<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import CheckBox from './CheckBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/CheckBox',
    component: CheckBox,
    args: { label: 'Include open file', checked: false, indeterminate: false, disabled: false },
    argTypes: {
      label: { control: 'text' },
      checked: { control: 'boolean' },
      indeterminate: { control: 'boolean' },
      disabled: { control: 'boolean' },
      onchange: { action: 'change' }
    }
  })
</script>

<Story name="Default" />

<Story name="Checked" args={{ checked: true }} />

<Story name="Indeterminate" args={{ indeterminate: true, label: 'Select all' }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="AllStates" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="col">
      <CheckBox label="Unchecked" />
      <CheckBox label="Checked" checked />
      <CheckBox label="Indeterminate" indeterminate />
      <CheckBox label="Disabled" disabled />
      <CheckBox label="Disabled checked" disabled checked />
      <CheckBox label="Disabled indeterminate" disabled indeterminate />
    </div>
  {/snippet}
</Story>

<Story name="CustomContent" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <CheckBox>Allow <b>unsafe</b> edits without asking</CheckBox>
  {/snippet}
</Story>

<style>
  .col {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
