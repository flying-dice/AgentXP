<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TimeUpDown from './TimeUpDown.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/TimeUpDown',
    component: TimeUpDown,
    args: { value: 9 * 60, disabled: false, readonly: false, minuteStep: 1 },
    argTypes: {
      value: { control: { type: 'number', min: 0, max: 1439 } },
      minuteStep: { control: { type: 'number', min: 1, max: 30 } },
      disabled: { control: 'boolean' },
      readonly: { control: 'boolean' },
      onchange: { action: 'change' }
    }
  })
</script>

<script lang="ts">
  let time = $state(17 * 60 + 45)
</script>

<Story name="Default" />

<Story name="Afternoon" args={{ value: 15 * 60 + 30 }} />

<Story name="FiveMinuteSteps" args={{ value: 8 * 60 + 30, minuteStep: 5 }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="ReadOnly" args={{ readonly: true }} />

<Story name="Bound">
  <div style="display:flex;flex-direction:column;gap:8px">
    <TimeUpDown bind:value={time} />
    <div>Minutes since midnight: {time}</div>
  </div>
</Story>
