<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Separator from './Separator.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Separator',
    component: Separator,
    argTypes: {
      orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
      variant: { control: 'inline-radio', options: ['menu', 'toolbar'] }
    },
    args: { orientation: 'horizontal', variant: 'toolbar' }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:200px;height:40px;display:flex;flex-direction:{args.orientation === 'vertical' ? 'row' : 'column'};justify-content:center">
      <Separator {...args} />
    </div>
  {/snippet}
</Story>

<Story name="Toolbar vertical">
  <div style="display:flex;align-items:center;height:28px;padding:0 6px;background:var(--xp-toolbar-face)">
    <span>New</span><Separator orientation="vertical" /><span>Open</span><Separator orientation="vertical" /><span>Save</span>
  </div>
</Story>

<Story name="Menu horizontal">
  <div style="width:220px;padding:2px;background:var(--xp-menu-face);border:1px solid var(--xp-menu-border)">
    <div style="padding:3px 28px">Cut</div>
    <Separator variant="menu" />
    <div style="padding:3px 28px">Paste</div>
  </div>
</Story>
