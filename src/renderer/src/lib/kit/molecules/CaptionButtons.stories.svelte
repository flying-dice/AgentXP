<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import CaptionButtons from './CaptionButtons.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/CaptionButtons',
    component: CaptionButtons,
    args: { windowState: 'Normal', active: true, minimizeBox: true, maximizeBox: true, closeBox: true, closeEnabled: true },
    argTypes: {
      windowState: { control: 'inline-radio', options: ['Normal', 'Maximized'] },
      active: { control: 'boolean' },
      minimizeBox: { control: 'boolean' },
      maximizeBox: { control: 'boolean' },
      closeBox: { control: 'boolean' },
      closeEnabled: { control: 'boolean' },
      onminimize: { action: 'minimize' },
      onmaximize: { action: 'maximize' },
      onrestore: { action: 'restore' },
      onclose: { action: 'close' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="frame"><CaptionButtons {...args} /></div>
  {/snippet}
</Story>

<Story name="Maximized" args={{ windowState: 'Maximized' }}>
  {#snippet template(args)}
    <div class="frame"><CaptionButtons {...args} /></div>
  {/snippet}
</Story>

<Story name="Inactive" args={{ active: false }}>
  {#snippet template(args)}
    <div class="frame inactive"><CaptionButtons {...args} /></div>
  {/snippet}
</Story>

<Story name="CloseOnly" args={{ minimizeBox: false, maximizeBox: false }}>
  {#snippet template(args)}
    <div class="frame"><CaptionButtons {...args} /></div>
  {/snippet}
</Story>

<Story name="DisabledBoxes" args={{ maximizeBox: false, closeEnabled: false }}>
  {#snippet template(args)}
    <div class="frame"><CaptionButtons {...args} /></div>
  {/snippet}
</Story>

<style>
  .frame {
    display: inline-flex;
    justify-content: flex-end;
    width: 220px;
    padding: 0 7px;
    background: var(--xp-frame-active);
    border: 1px solid var(--xp-frame-border);
  }
  .frame.inactive {
    background: var(--xp-frame-inactive);
  }
</style>
