<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import TitleBar from './TitleBar.svelte'
  import { iconNames } from '../atoms/icons'

  const { Story } = defineMeta({
    title: 'Molecules/TitleBar',
    component: TitleBar,
    args: { title: 'Fix login redirect bug - Claude Code', iconName: 'claude', active: true, windowState: 'Normal', dialog: false, draggable: false },
    argTypes: {
      title: { control: 'text' },
      iconName: { control: 'select', options: iconNames },
      active: { control: 'boolean' },
      windowState: { control: 'inline-radio', options: ['Normal', 'Maximized'] },
      dialog: { control: 'boolean' },
      draggable: { control: 'boolean' },
      onminimize: { action: 'minimize' },
      onmaximize: { action: 'maximize' },
      onrestore: { action: 'restore' },
      onclose: { action: 'close' }
    }
  })
</script>

{#snippet bar(args: ComponentProps<typeof TitleBar>, inactive = false)}
  <div class="frame" class:inactive>
    <TitleBar {...args} />
  </div>
{/snippet}

<Story name="Default">
  {#snippet template(args)}{@render bar(args)}{/snippet}
</Story>

<Story name="Inactive" args={{ active: false }}>
  {#snippet template(args)}{@render bar(args, true)}{/snippet}
</Story>

<Story name="Dialog" args={{ dialog: true, title: 'Claude Code', iconName: 'shield' }}>
  {#snippet template(args)}{@render bar(args)}{/snippet}
</Story>

<Story name="Maximized" args={{ windowState: 'Maximized' }}>
  {#snippet template(args)}{@render bar(args)}{/snippet}
</Story>

<Story name="Draggable" args={{ draggable: true }}>
  {#snippet template(args)}
    {@render bar(args)}
    <p class="hint">Carries <code>-webkit-app-region: drag</code> for frameless Electron windows; the caption buttons are no-drag. Double-click toggles maximise.</p>
  {/snippet}
</Story>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    width: 520px;
    padding: 0 7px;
    background: var(--xp-frame-active);
    border: 1px solid var(--xp-frame-border);
    border-radius: 8px 8px 0 0;
  }
  .frame.inactive {
    background: var(--xp-frame-inactive);
    border-color: var(--xp-frame-inactive-border);
  }
  .hint {
    font-size: 11px;
    color: #555;
    max-width: 520px;
  }
</style>
