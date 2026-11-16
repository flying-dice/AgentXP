<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { createAppMenus, toggleMenuItem } from './MenuStrip.fixtures'
  import ContextMenuStrip from './ContextMenuStrip.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/ContextMenuStrip',
    component: ContextMenuStrip,
    argTypes: { open: { control: 'boolean' }, x: { control: 'number' }, y: { control: 'number' }, onselect: { action: 'select' } }
  })
</script>

<script lang="ts">
  const menus = $state(createAppMenus())
  const items = menus[1].items
  const viewItems = menus[2].items
  let open = $state(false)
  let x = $state(0)
  let y = $state(0)
  let last = $state('(nothing yet)')
</script>

<Story name="RightClick">
  {#snippet template(args)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="area"
      oncontextmenu={(e) => {
        e.preventDefault()
        x = e.clientX
        y = e.clientY
        open = true
      }}
    >
      Right-click anywhere in this area. Last: {last}
    </div>
    <ContextMenuStrip
      {...args}
      bind:open
      {x}
      {y}
      items={[...items, { separator: true }, { label: 'View', items: viewItems }]}
      onselect={(i) => {
        toggleMenuItem([viewItems], i)
        last = i.label?.replace('&', '') ?? ''
        args.onselect?.(i)
      }}
    />
  {/snippet}
</Story>

<Story name="OpenAtPoint" args={{ open: true, x: 40, y: 20, items: createAppMenus()[0].items }} />

<style>
  .area {
    width: 480px;
    height: 240px;
    padding: 8px;
    background: #fff;
    border: 1px solid #898c95;
    color: #555;
  }
</style>
