<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Panel from './Panel.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Panel',
    component: Panel,
    argTypes: {
      borderStyle: { control: 'inline-radio', options: ['None', 'FixedSingle', 'Fixed3D'] },
      autoScroll: { control: 'boolean' }
    },
    args: { borderStyle: 'FixedSingle', autoScroll: false }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <Panel {...args} style="width:220px;height:80px;padding:6px">Panel content</Panel>
  {/snippet}
</Story>

<Story name="Border styles">
  <div style="display:flex;gap:12px">
    {#each ['None', 'FixedSingle', 'Fixed3D'] as const as b}
      <Panel borderStyle={b} style="width:120px;height:70px;padding:6px;background:#fff">{b}</Panel>
    {/each}
  </div>
</Story>

<Story name="AutoScroll" args={{ autoScroll: true, borderStyle: 'Fixed3D' }}>
  {#snippet template(args)}
    <Panel {...args} style="width:200px;height:100px;background:#fff">
      <div style="width:400px;height:300px;padding:6px">Content larger than the panel scrolls with Win7 scrollbars.</div>
    </Panel>
  {/snippet}
</Story>
