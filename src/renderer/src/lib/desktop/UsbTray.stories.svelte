<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import UsbTray from './UsbTray.svelte'
  import Taskbar from '../kit/organisms/Taskbar.svelte'
  import { systemDrive, usbDrive } from '../app/fakeVfs'

  const one = [systemDrive(), usbDrive('E', { id: 1, name: 'claude-code-win' })]
  const two = [...one, usbDrive('F', { id: 2, name: 'dotfiles' })]

  const { Story } = defineMeta({
    title: 'Desktop/UsbTray',
    component: UsbTray,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } },
    args: { drives: one, open: false, oneject: fn() },
    argTypes: { oneject: { action: 'eject' }, open: { control: 'boolean' } }
  })
</script>

<Story name="Closed">
  {#snippet template(args)}
    <div class="stage">
      <div class="bar"><Taskbar items={[]}>{#snippet tray()}<UsbTray {...args} />{/snippet}</Taskbar></div>
    </div>
  {/snippet}
</Story>

<Story name="MenuOpen" args={{ open: true }}>
  {#snippet template(args)}
    <div class="stage">
      <div class="bar"><Taskbar items={[]}>{#snippet tray()}<UsbTray {...args} />{/snippet}</Taskbar></div>
    </div>
  {/snippet}
</Story>

<Story name="TwoDrives" args={{ open: true, drives: two }}>
  {#snippet template(args)}
    <div class="stage">
      <div class="bar"><Taskbar items={[]}>{#snippet tray()}<UsbTray {...args} />{/snippet}</Taskbar></div>
    </div>
  {/snippet}
</Story>

<Story name="NoUsbDrive_Hidden" args={{ drives: [systemDrive()] }}>
  {#snippet template(args)}
    <div class="stage">
      <div class="bar"><Taskbar items={[]}>{#snippet tray()}<UsbTray {...args} />{/snippet}</Taskbar></div>
    </div>
  {/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
  }
</style>
