<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MainWindowTemplate from './MainWindowTemplate.svelte'
  import MenuStrip from '../organisms/MenuStrip.svelte'
  import StatusStrip from '../organisms/StatusStrip.svelte'
  import StatusStripLabel from '../molecules/StatusStripLabel.svelte'
  import ToolStrip from '../organisms/ToolStrip.svelte'
  import ToolStripButton from '../molecules/ToolStripButton.svelte'
  import Separator from '../atoms/Separator.svelte'
  import { createAppMenus } from '../organisms/MenuStrip.fixtures'

  const { Story } = defineMeta({
    title: 'Templates/MainWindow',
    component: MainWindowTemplate,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: {
      title: 'Fix login redirect bug - AgentXP',
      active: true,
      windowState: 'Normal',
      draggable: false,
      leftWidth: 250,
      rightWidth: 330,
      leftMinWidth: 160,
      rightMinWidth: 240,
      centerMinWidth: 320
    },
    argTypes: {
      title: { control: 'text' },
      active: { control: 'boolean' },
      windowState: { control: 'inline-radio', options: ['Normal', 'Maximized'] },
      leftWidth: { control: { type: 'number', min: 160, max: 500 } },
      rightWidth: { control: { type: 'number', min: 240, max: 600 } },
      onclose: { action: 'close' },
      onminimize: { action: 'minimize' }
    }
  })
</script>

{#snippet menu()}<MenuStrip menus={createAppMenus()} />{/snippet}
{#snippet toolbar()}
  <ToolStrip>
    <ToolStripButton icon="new" text="New session" />
    <ToolStripButton icon="open-folder" text="Open folder" />
    <Separator orientation="vertical" variant="toolbar" />
    <ToolStripButton icon="stop" text="Stop" disabled />
    {#snippet trailing()}<ToolStripButton icon="options" text="Options" />{/snippet}
  </ToolStrip>
{/snippet}
{#snippet statusbar()}
  <StatusStrip>
    <StatusStripLabel text="Ready" spring />
    <StatusStripLabel text="Connected" borders={['left']} />
  </StatusStrip>
{/snippet}
{#snippet pane(text: string)}<div class="box">{text}</div>{/snippet}
{#snippet left()}{@render pane('Left pane')}{/snippet}
{#snippet center()}{@render pane('Centre pane')}{/snippet}
{#snippet right()}{@render pane('Right pane')}{/snippet}

<Story name="Default">
  {#snippet template(args)}
    <div style="position:relative;height:100vh;background:var(--xp-desktop)">
      <MainWindowTemplate {...args} {menu} {toolbar} {statusbar} {left} {center} {right} />
    </div>
  {/snippet}
</Story>

<Story name="Inactive" args={{ active: false }}>
  {#snippet template(args)}
    <div style="position:relative;height:100vh;background:var(--xp-desktop)">
      <MainWindowTemplate {...args} {menu} {toolbar} {statusbar} {left} {center} {right} />
    </div>
  {/snippet}
</Story>

<Story name="Maximized" args={{ windowState: 'Maximized' }}>
  {#snippet template(args)}
    <div style="position:relative;height:100vh;background:var(--xp-desktop)">
      <MainWindowTemplate {...args} {menu} {toolbar} {statusbar} {left} {center} {right} />
    </div>
  {/snippet}
</Story>

<style>
  .box {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--xp-window);
    border: 1px solid var(--xp-panel-border);
    color: var(--xp-text-muted);
  }
</style>
