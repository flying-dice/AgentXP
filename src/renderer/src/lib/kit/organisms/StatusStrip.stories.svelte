<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ProgressBar from '../atoms/ProgressBar.svelte'
  import StatusStripLabel from '../molecules/StatusStripLabel.svelte'
  import StatusStrip from './StatusStrip.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/StatusStrip',
    component: StatusStrip,
    args: { sizeGrip: true },
    argTypes: { sizeGrip: { control: 'boolean' } }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:760px">
      <StatusStrip sizeGrip={args.sizeGrip}>
        <StatusStripLabel text="Ready" spring />
        <StatusStripLabel text="Branch: main" borders={['left']} />
        <StatusStripLabel text="Claude Sonnet 5.5" borders={['left']} />
        <StatusStripLabel borders={['left']}>
          <span>Context</span>
          <ProgressBar value={6} width={90} label="Context" style="Continuous" class="ctx" />
          <span class="pct">6%</span>
        </StatusStripLabel>
        <StatusStripLabel text="Connected" borders={['left']} />
      </StatusStrip>
    </div>
  {/snippet}
</Story>

<Story name="NoSizeGrip" args={{ sizeGrip: false }}>
  {#snippet template(args)}
    <div style="width:480px">
      <StatusStrip sizeGrip={args.sizeGrip}>
        <StatusStripLabel text="Loading folder..." spring />
        <StatusStripLabel borders={['left']}><ProgressBar style="Marquee" width={100} label="Loading" /></StatusStripLabel>
      </StatusStrip>
    </div>
  {/snippet}
</Story>

<style>
  .pct {
    width: 30px;
    text-align: right;
  }
</style>
