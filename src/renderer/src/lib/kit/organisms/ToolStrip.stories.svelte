<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Separator from '../atoms/Separator.svelte'
  import ToolStripButton from '../molecules/ToolStripButton.svelte'
  import ToolStripDropDownButton from '../molecules/ToolStripDropDownButton.svelte'
  import { createAppMenus } from './MenuStrip.fixtures'
  import ToolStrip from './ToolStrip.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/ToolStrip',
    component: ToolStrip
  })
</script>

<Story name="Default">
  {#snippet template()}
    <div style="width:720px">
      <ToolStrip>
        <ToolStripButton icon="new" text="New session" />
        <ToolStripButton icon="open-folder" text="Open folder" />
        <ToolStripButton icon="save" text="Save" />
        <Separator orientation="vertical" variant="toolbar" />
        <ToolStripButton icon="undo" text="Undo edit" disabled />
        <ToolStripButton icon="compact" text="Compact" />
        <Separator orientation="vertical" variant="toolbar" />
        <ToolStripButton icon="stop" text="Stop" disabled />
        {#snippet trailing()}
          <ToolStripButton icon="options" text="Options" />
        {/snippet}
      </ToolStrip>
    </div>
  {/snippet}
</Story>

<Story name="WithDropDownAndToggles">
  {#snippet template()}
    <div style="width:720px;height:240px">
      <ToolStrip>
        <ToolStripDropDownButton icon="open-folder" text="Open" items={createAppMenus()[0].items} />
        <Separator orientation="vertical" variant="toolbar" />
        <ToolStripButton icon="changes" text="Changes" checked checkOnClick />
        <ToolStripButton icon="tasks" text="Tasks" checked={false} checkOnClick />
        <ToolStripButton icon="search" title="Find" />
      </ToolStrip>
    </div>
  {/snippet}
</Story>
