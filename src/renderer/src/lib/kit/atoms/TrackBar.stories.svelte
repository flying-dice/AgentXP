<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TrackBar from './TrackBar.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/TrackBar',
    component: TrackBar,
    argTypes: {
      value: { control: 'number' },
      min: { control: 'number' },
      max: { control: 'number' },
      step: { control: 'number' },
      tickFrequency: { control: 'number' },
      tickStyle: { control: 'inline-radio', options: ['None', 'BottomRight', 'TopLeft', 'Both'] },
      orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
      disabled: { control: 'boolean' },
      length: { control: 'number' }
    },
    args: { value: 4, min: 0, max: 10, step: 1, tickFrequency: 1, tickStyle: 'BottomRight', orientation: 'horizontal', disabled: false, length: 220 }
  })
</script>

<script lang="ts">
  let v = $state(30)
</script>

<Story name="Default" />
<Story name="Ticks top-left" args={{ tickStyle: 'TopLeft' }} />
<Story name="Ticks both" args={{ tickStyle: 'Both' }} />
<Story name="No ticks" args={{ tickStyle: 'None' }} />
<Story name="Vertical" args={{ orientation: 'vertical', length: 160 }} />
<Story name="Disabled" args={{ disabled: true }} />

<Story name="Bound, 0-100 by 10">
  <div style="display:flex;flex-direction:column;gap:6px">
    <TrackBar bind:value={v} min={0} max={100} step={5} tickFrequency={10} tickStyle="Both" length={260} />
    <div>Value: {v}</div>
  </div>
</Story>
