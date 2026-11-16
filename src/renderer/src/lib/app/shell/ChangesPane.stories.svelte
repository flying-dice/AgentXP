<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import ChangesPane from './ChangesPane.svelte'
  import { sampleChanges } from '../fakeApi'

  const { Story } = defineMeta({
    title: 'App/ChangesPane',
    component: ChangesPane,
    args: { changes: sampleChanges, selectedId: 1 },
    argTypes: { onrevert: { action: 'revert' }, onopeneditor: { action: 'openeditor' } }
  })
</script>

{#snippet frame(args: ComponentProps<typeof ChangesPane>)}
  <div class="frame"><ChangesPane {...args} /></div>
{/snippet}

<Story name="WithChanges">{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="NothingSelected" args={{ selectedId: null }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>
<Story name="Empty" args={{ changes: [], selectedId: null }}>{#snippet template(args)}{@render frame(args)}{/snippet}</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    width: 330px;
    height: 560px;
    border: 1px solid var(--w7-panel-border);
    background: var(--w7-window);
  }
</style>
