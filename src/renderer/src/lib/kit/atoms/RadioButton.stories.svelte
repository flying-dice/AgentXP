<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import RadioButton from './RadioButton.svelte'
  import RadioButtonGroup from './RadioButtonGroup.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/RadioButton',
    component: RadioButtonGroup,
    args: { value: 'ask', orientation: 'vertical', disabled: false },
    argTypes: {
      value: { control: 'text' },
      orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
      disabled: { control: 'boolean' },
      onchange: { action: 'change' }
    }
  })
</script>

<Story name="Vertical">
  {#snippet template(args)}
    <RadioButtonGroup {...args} aria-label="Permission mode">
      <RadioButton value="ask" label="Ask before edits" />
      <RadioButton value="auto" label="Edit automatically" />
      <RadioButton value="plan" label="Plan mode" />
      <RadioButton value="never" label="Never allowed" disabled />
    </RadioButtonGroup>
  {/snippet}
</Story>

<Story name="Horizontal" args={{ orientation: 'horizontal', value: 'b' }}>
  {#snippet template(args)}
    <RadioButtonGroup {...args} aria-label="Choice">
      <RadioButton value="a" label="Alpha" />
      <RadioButton value="b" label="Beta" />
      <RadioButton value="c" label="Gamma" />
    </RadioButtonGroup>
  {/snippet}
</Story>

<Story name="GroupDisabled" args={{ disabled: true }}>
  {#snippet template(args)}
    <RadioButtonGroup {...args} aria-label="Disabled group">
      <RadioButton value="ask" label="Ask before edits" />
      <RadioButton value="auto" label="Edit automatically" />
    </RadioButtonGroup>
  {/snippet}
</Story>
