<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { createAppMenus, toggleMenuItem } from './MenuStrip.fixtures'
  import MenuStrip from './MenuStrip.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/MenuStrip',
    component: MenuStrip,
    argTypes: { onselect: { action: 'select' } }
  })
</script>

<script lang="ts">
  const menus = $state(createAppMenus())
  const groups = $derived(menus.flatMap((m) => [m.items, ...m.items.flatMap((i) => (i.items ? [i.items] : []))]))
  let last = $state('(nothing yet)')
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:640px;height:260px">
      <MenuStrip
        {...args}
        {menus}
        onselect={(item) => {
          toggleMenuItem(groups, item)
          last = item.label?.replace('&', '') ?? ''
          args.onselect?.(item)
        }}
      />
      <p style="font-size:11px;color:#555;padding:8px">
        Click a menu, hover to switch, use arrow keys / Enter / Esc. Press Alt (or Alt+letter) for mnemonics. Last: {last}
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Mnemonics" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="width:640px;height:80px">
      <MenuStrip menus={createAppMenus()} />
      <p style="font-size:11px;color:#555;padding:8px">Focus the page, then tap Alt: underlines appear and the strip takes keyboard focus.</p>
    </div>
  {/snippet}
</Story>
