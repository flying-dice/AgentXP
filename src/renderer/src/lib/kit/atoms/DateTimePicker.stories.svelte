<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DateTimePicker from './DateTimePicker.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/DateTimePicker',
    component: DateTimePicker,
    argTypes: {
      format: { control: 'inline-radio', options: ['Long', 'Short', 'Time'] },
      disabled: { control: 'boolean' },
      width: { control: 'number' }
    },
    args: { value: new Date(2026, 10, 18, 14, 30, 5), format: 'Long', disabled: false, width: 230 }
  })
</script>

<script lang="ts">
  let d = $state(new Date(2026, 5, 1))
</script>

<Story name="Long" />
<Story name="Short" args={{ format: 'Short', width: 120 }} />
<Story name="Time" args={{ format: 'Time', width: 100 }} />
<Story name="Disabled" args={{ disabled: true }} />

<Story name="Bound">
  <div style="display:flex;flex-direction:column;gap:8px;min-height:240px">
    <DateTimePicker bind:value={d} format="Short" width={130} />
    <div>Value: {d.toDateString()}</div>
  </div>
</Story>
