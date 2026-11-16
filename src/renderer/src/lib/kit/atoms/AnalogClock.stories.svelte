<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import AnalogClock from './AnalogClock.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/AnalogClock',
    component: AnalogClock,
    args: { time: new Date(2026, 10, 16, 3, 56), size: 64 },
    argTypes: { size: { control: { type: 'range', min: 32, max: 200 } } }
  })
</script>

<Story name="Default" />
<Story name="Large" args={{ size: 140, time: new Date(2026, 10, 16, 9, 10) }} />
