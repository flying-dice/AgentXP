<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ScrollBar from './ScrollBar.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/ScrollBar',
    component: ScrollBar,
    argTypes: {
      orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
      value: { control: 'number' },
      min: { control: 'number' },
      max: { control: 'number' },
      smallChange: { control: 'number' },
      largeChange: { control: 'number' },
      disabled: { control: 'boolean' },
      length: { control: 'number' }
    },
    args: { orientation: 'vertical', value: 20, min: 0, max: 100, smallChange: 1, largeChange: 10, disabled: false, length: 180 }
  })
</script>

<script lang="ts">
  let v = $state(40)
</script>

<Story name="VScrollBar" />
<Story name="HScrollBar" args={{ orientation: 'horizontal', length: 260 }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="Large thumb" args={{ largeChange: 60 }} />

<Story name="Bound">
  <div style="display:flex;gap:16px;align-items:flex-start">
    <ScrollBar bind:value={v} />
    <ScrollBar bind:value={v} orientation="horizontal" length={220} />
    <div>Value: {v}</div>
  </div>
</Story>
