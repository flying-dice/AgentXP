<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Gadget from './Gadget.svelte'
  import Gauge from '../atoms/Gauge.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/Gadget',
    component: Gadget,
    parameters: { layout: 'centered', backgrounds: { disable: true } },
    args: { title: 'Context meter' },
    argTypes: { title: { control: 'text' } }
  })
</script>

<Story name="Default" asChild>
  <div class="stage">
    <Gadget title="Context meter">
      <div class="row"><Gauge value={0.39} /><div><div class="big">39%</div><div class="muted">78k of 200k tokens</div></div></div>
    </Gadget>
  </div>
</Story>

<Story name="TextOnly" asChild>
  <div class="stage"><Gadget title="Activity">Nothing has happened yet.</Gadget></div>
</Story>

<style>
  .stage {
    width: 220px;
    padding: 24px;
    background: var(--w7-desktop-bg);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .big {
    font-size: 20px;
  }
  .muted {
    font-size: 11px;
    color: var(--w7-gadget-muted);
  }
</style>
