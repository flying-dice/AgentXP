<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { iconNames } from '../atoms/icons'
  import TabHeader from './TabHeader.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/TabHeader',
    component: TabHeader,
    args: { title: 'Sessions', selected: false, disabled: false },
    argTypes: {
      selected: { control: 'boolean' },
      disabled: { control: 'boolean' },
      icon: { control: 'select', options: [undefined, ...iconNames] },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default" />

<Story name="Selected" args={{ selected: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="WithIcon" args={{ icon: 'changes', title: 'Changes', selected: true }} />

<Story name="Row" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div role="tablist" style="display:flex;padding:8px 3px 0">
      <TabHeader title="Changes" selected />
      <TabHeader title="Tasks" />
      <TabHeader title="Properties" />
    </div>
    <div style="height:2px;margin:0 3px;border-top:1px solid #898c95;background:#fff"></div>
  {/snippet}
</Story>
