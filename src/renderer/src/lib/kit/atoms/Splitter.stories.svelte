<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Splitter from './Splitter.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Splitter',
    component: Splitter,
    argTypes: {
      orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
      step: { control: 'number' },
      disabled: { control: 'boolean' }
    },
    args: { orientation: 'vertical', step: 10, disabled: false }
  })
</script>

<script lang="ts">
  let size = $state(160)
</script>

<Story name="Default">
  {#snippet template(args)}
    {@const vertical = args.orientation === 'vertical'}
    <div class="demo" style="display:flex;flex-direction:{vertical ? 'row' : 'column'};width:420px;height:200px;border:1px solid #898c95;background:#fff">
      <div style="{vertical ? 'width' : 'height'}:{size}px;padding:6px;overflow:hidden">Pane 1 ({size}px)</div>
      <Splitter {...args} onresize={(d) => (size = Math.max(40, size + d))} />
      <div style="flex:1;padding:6px;overflow:hidden">Pane 2</div>
    </div>
  {/snippet}
</Story>
