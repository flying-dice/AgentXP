<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import NumericUpDown from './NumericUpDown.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/NumericUpDown',
    component: NumericUpDown,
    args: { value: 5, min: 0, max: 100, step: 1, decimalPlaces: 0, disabled: false, readonly: false },
    argTypes: {
      value: { control: 'number' },
      min: { control: 'number' },
      max: { control: 'number' },
      step: { control: 'number' },
      decimalPlaces: { control: { type: 'number', min: 0, max: 6 } },
      disabled: { control: 'boolean' },
      readonly: { control: 'boolean' },
      onchange: { action: 'change' }
    }
  })
</script>

<Story name="Default" />

<Story name="Decimal" args={{ value: 1.5, step: 0.25, decimalPlaces: 2, min: 0, max: 10 }} />

<Story name="AtMaximum" args={{ value: 10, max: 10 }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="ReadOnly" args={{ readonly: true }} />
