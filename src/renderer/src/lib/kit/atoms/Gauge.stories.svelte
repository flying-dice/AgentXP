<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Gauge from './Gauge.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Gauge',
    component: Gauge,
    args: { value: 0.39, size: 92, danger: 0.8 },
    argTypes: { value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } }, size: { control: { type: 'range', min: 40, max: 200 } }, danger: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } }
  })
</script>

<Story name="Default" />
<Story name="Empty" args={{ value: 0 }} />
<Story name="InTheRed" args={{ value: 0.93 }} />
