<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import SplitContainer from './SplitContainer.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/SplitContainer',
    component: SplitContainer,
    args: { orientation: 'vertical', splitterDistance: 160, panel1MinSize: 60, panel2MinSize: 60, fixedPanel: 'none' },
    argTypes: {
      orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
      fixedPanel: { control: 'inline-radio', options: ['none', 'panel1', 'panel2'] },
      splitterDistance: { control: { type: 'number', min: 0, max: 600 } },
      onchange: { action: 'change' }
    }
  })
</script>

<script lang="ts">
  let distance = $state(160)
  let w = $state(480)
</script>

{#snippet p1()}<div class="pane">Panel 1</div>{/snippet}
{#snippet p2()}<div class="pane">Panel 2</div>{/snippet}
{#snippet top()}<div class="pane">Top</div>{/snippet}
{#snippet bottom()}<div class="pane">Bottom</div>{/snippet}
{#snippet flexible()}<div class="pane">Flexible</div>{/snippet}
{#snippet fixed()}<div class="pane">Fixed width</div>{/snippet}

<Story name="Vertical">
  {#snippet template(args)}
    <div style="width:{w}px;height:200px;border:1px solid #898c95">
      <SplitContainer {...args} bind:splitterDistance={distance} panel1={p1} panel2={p2} />
    </div>
    <p style="font-size:11px;color:#555">
      splitterDistance = {distance}px
      <button onclick={() => (w = w === 480 ? 620 : 480)}>Resize container</button>
    </p>
  {/snippet}
</Story>

<Story name="Horizontal" args={{ orientation: 'horizontal', splitterDistance: 80 }}>
  {#snippet template(args)}
    <div style="width:400px;height:240px;border:1px solid #898c95">
      <SplitContainer {...args} panel1={top} panel2={bottom} />
    </div>
  {/snippet}
</Story>

<Story name="FixedPanel2" args={{ fixedPanel: 'panel2' }}>
  {#snippet template(args)}
    <div style="width:{w}px;height:160px;border:1px solid #898c95">
      <SplitContainer {...args} splitterDistance={300} panel1={flexible} panel2={fixed} />
    </div>
    <p style="font-size:11px;color:#555"><button onclick={() => (w = w === 480 ? 620 : 480)}>Resize container</button></p>
  {/snippet}
</Story>

<style>
  .pane {
    flex: 1;
    padding: 8px;
    background: #fff;
  }
</style>
