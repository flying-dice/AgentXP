<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { createAppMenus, toggleMenuItem } from '../organisms/MenuStrip.fixtures'
  import MenuPopup from './MenuPopup.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/MenuPopup',
    component: MenuPopup,
    args: { showMnemonics: false },
    argTypes: { showMnemonics: { control: 'boolean' }, onselect: { action: 'select' } }
  })
</script>

<script lang="ts">
  const menus = $state(createAppMenus())
  const groups = $derived(menus.map((m) => m.items))
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="height:260px">
      <MenuPopup {...args} autofocus items={menus[0].items} onselect={(i) => { toggleMenuItem(groups, i); args.onselect?.(i) }} />
    </div>
  {/snippet}
</Story>

<Story name="CheckAndRadio">
  {#snippet template(args)}
    <MenuPopup {...args} items={menus[2].items} onselect={(i) => { toggleMenuItem(groups, i); args.onselect?.(i) }} />
  {/snippet}
</Story>
