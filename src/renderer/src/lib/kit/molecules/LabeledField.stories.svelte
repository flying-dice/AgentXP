<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ComboBox from '../atoms/ComboBox.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import LabeledField from './LabeledField.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/LabeledField',
    component: LabeledField,
    args: { label: 'Agent command:', labelWidth: 110, disabled: false },
    argTypes: { labelWidth: { control: { type: 'number', min: 40, max: 240 } }, disabled: { control: 'boolean' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:380px">
      <LabeledField label={args.label} labelWidth={args.labelWidth} disabled={args.disabled} for="cmd">
        <TextBox id="cmd" value="npx -y @zed-industries/claude-code-acp" />
      </LabeledField>
    </div>
  {/snippet}
</Story>

<Story name="Form" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="width:380px;display:flex;flex-direction:column;gap:6px">
      <LabeledField label="Name:" for="n"><TextBox id="n" value="claude-code-win" /></LabeledField>
      <LabeledField label="Working folder:" for="f"><TextBox id="f" value="C:\Users\jonathan\source" /></LabeledField>
      <LabeledField label="Mode:">
        <ComboBox items={[{ value: 'ask', label: 'Ask before edits' }, { value: 'auto', label: 'Edit automatically' }]} value="ask" aria-label="Mode" />
      </LabeledField>
      <LabeledField label="Disabled:" disabled for="d"><TextBox id="d" value="n/a" disabled /></LabeledField>
    </div>
  {/snippet}
</Story>
