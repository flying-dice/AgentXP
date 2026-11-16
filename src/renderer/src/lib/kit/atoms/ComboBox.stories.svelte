<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ComboBox from './ComboBox.svelte'

  const modes = [
    { value: 'ask', label: 'Ask before edits' },
    { value: 'auto', label: 'Edit automatically' },
    { value: 'plan', label: 'Plan mode' },
    { value: 'bypass', label: 'Bypass permissions', disabled: true }
  ]

  const { Story } = defineMeta({
    title: 'Atoms/ComboBox',
    component: ComboBox,
    args: { items: modes, value: 'ask', dropDownStyle: 'DropDownList', disabled: false, maxDropDownItems: 8 },
    argTypes: {
      items: { control: 'object' },
      value: { control: 'text' },
      dropDownStyle: { control: 'inline-radio', options: ['DropDownList', 'DropDown'] },
      placeholder: { control: 'text' },
      disabled: { control: 'boolean' },
      maxDropDownItems: { control: 'number' },
      onchange: { action: 'change' }
    }
  })
</script>

<Story name="DropDownList" />

<Story name="DropDown" args={{ dropDownStyle: 'DropDown' }} />

<Story name="Placeholder" args={{ value: '', placeholder: '(none)' }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story
  name="ManyItems"
  args={{
    maxDropDownItems: 6,
    value: 'claude-sonnet-5-5',
    items: ['claude-opus-5', 'claude-sonnet-5-5', 'claude-haiku-5', 'claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4', 'claude-sonnet-3-7', 'claude-haiku-3-5', 'claude-3-opus'].map((v) => ({ value: v, label: v }))
  }}
/>

<Story name="BothStyles" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="display: flex; flex-direction: column; gap: 10px; min-height: 180px">
      <ComboBox items={modes} value="ask" aria-label="Mode (list)" />
      <ComboBox items={modes} value="auto" dropDownStyle="DropDown" aria-label="Mode (editable)" />
    </div>
  {/snippet}
</Story>
