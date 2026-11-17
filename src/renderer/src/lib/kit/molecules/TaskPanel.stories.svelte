<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TaskPanel from './TaskPanel.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/TaskPanel',
    component: TaskPanel,
    args: { title: 'File and Folder Tasks', open: true, special: false },
    argTypes: { open: { control: 'boolean' }, special: { control: 'boolean' }, ontoggle: { action: 'toggle' } }
  })
</script>

{#snippet body()}
  <ul style="margin:0;padding-left:16px">
    <li>Make a new folder</li>
    <li>Publish this folder to the Web</li>
    <li>Share this folder</li>
  </ul>
{/snippet}

<Story name="Default">
  {#snippet template(args)}
    <div style="width:210px;padding:12px;background:linear-gradient(#7ba2e7,#6375d6)">
      <TaskPanel {...args} children={body} />
    </div>
  {/snippet}
</Story>

<Story name="Special" args={{ title: 'Basic Shapes', special: true }}>
  {#snippet template(args)}
    <div style="width:210px;padding:12px;background:linear-gradient(#7ba2e7,#6375d6)">
      <TaskPanel {...args} children={body} />
    </div>
  {/snippet}
</Story>

<Story name="Collapsed" args={{ open: false }}>
  {#snippet template(args)}
    <div style="width:210px;padding:12px;background:linear-gradient(#7ba2e7,#6375d6)">
      <TaskPanel {...args} children={body} />
    </div>
  {/snippet}
</Story>
