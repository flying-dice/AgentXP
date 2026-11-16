<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TabControl from './TabControl.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/TabControl',
    component: TabControl,
    argTypes: { onchange: { action: 'change' } }
  })

  const tabs = [
    { id: 'changes', title: 'Changes' },
    { id: 'tasks', title: 'Tasks' },
    { id: 'props', title: 'Properties' }
  ]
</script>

<script lang="ts">
  let selected = $state('changes')
  let iconSel = $state('a')
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:340px;height:200px;">
      <TabControl {...args} {tabs} bind:selected>
        {#snippet panel(tab)}
          <div style="padding:8px">Page: {tab.title}. Arrow keys and Ctrl+Tab switch tabs.</div>
        {/snippet}
      </TabControl>
    </div>
  {/snippet}
</Story>

<Story name="WithIconsAndDisabled">
  {#snippet template(args)}
    <div style="width:340px;height:160px;">
      <TabControl
        {...args}
        tabs={[{ id: 'a', title: 'Changes', icon: 'changes' }, { id: 'b', title: 'Tasks', icon: 'tasks', disabled: true }, { id: 'c', title: 'Properties', icon: 'properties' }]}
        bind:selected={iconSel}
       
      >
        {#snippet panel(tab)}
          <div style="padding:8px">{tab.title}</div>
        {/snippet}
      </TabControl>
    </div>
  {/snippet}
</Story>
