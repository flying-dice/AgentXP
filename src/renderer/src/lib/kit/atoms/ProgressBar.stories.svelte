<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ProgressBar from './ProgressBar.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/ProgressBar',
    component: ProgressBar,
    argTypes: {
      value: { control: { type: 'range', min: 0, max: 100 } },
      min: { control: 'number' },
      max: { control: 'number' },
      style: { control: 'inline-radio', options: ['Continuous', 'Blocks', 'Marquee'] },
      state: { control: 'inline-radio', options: ['normal', 'paused', 'error'] },
      width: { control: 'number' }
    },
    args: { value: 60, min: 0, max: 100, style: 'Continuous', state: 'normal', width: 240 }
  })
</script>

<Story name="Default" />
<Story name="Blocks" args={{ style: 'Blocks' }} />
<Story name="Marquee" args={{ style: 'Marquee' }} />
<Story name="Paused" args={{ state: 'paused' }} />
<Story name="Error" args={{ state: 'error' }} />
<Story name="Empty and full">
  <div style="display:flex;flex-direction:column;gap:8px">
    <ProgressBar value={0} />
    <ProgressBar value={100} />
  </div>
</Story>
<Story name="All styles and states">
  <div style="display:flex;flex-direction:column;gap:8px">
    {#each ['Continuous', 'Blocks', 'Marquee'] as const as s}
      {#each ['normal', 'paused', 'error'] as const as st}
        <ProgressBar style={s} state={st} value={70} />
      {/each}
    {/each}
  </div>
</Story>
