<script lang="ts">
  /**
   * The "Safely Remove Hardware and Eject Media" tray icon: a USB stick with a green tick. Click opens
   * a menu with one "Eject <drive>" entry per plugged-in project. Hidden while no USB drive is plugged in.
   */
  import type { DriveDto } from '@shared/vfs'
  import Icon from '../kit/atoms/Icon.svelte'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuItemDef } from '../kit/molecules/MenuItem'
  import { driveTitle, sortDrives } from '../apps/explorer/explorerModel'

  interface Props {
    drives: DriveDto[]
    open?: boolean
    oneject?: (letter: string) => void
    element?: HTMLButtonElement | null
  }

  let { drives, open = $bindable(false), oneject, element = $bindable(null) }: Props = $props()

  const usb = $derived(sortDrives(drives).filter((d) => d.kind === 'removable'))
  const items = $derived<MenuItemDef[]>(usb.map((d) => ({ testid: `usb-eject-${d.letter.toLowerCase()}`, label: `Eject ${driveTitle(d).replaceAll('&', '&&')}`, icon: 'usb', action: () => oneject?.(d.letter) })))
  let x = $state(0)
  let y = $state(0)

  // Position the popup upwards from the icon whenever it opens (also when opened from outside).
  $effect(() => {
    if (!open || !element) return
    const r = element.getBoundingClientRect()
    const barTop = element.closest('.w7-taskbar')?.getBoundingClientRect().top ?? r.top
    x = r.left - 8
    // The popup sits on top of the taskbar: about 24 px per entry plus the popup frame.
    y = barTop - usb.length * 24 - 12
  })
</script>

{#if usb.length > 0}
  <button
    bind:this={element}
    type="button"
    class="usb"
    data-testid="usb-tray"
    class:open
    aria-label="Safely Remove Hardware and Eject Media"
    aria-haspopup="menu"
    aria-expanded={open}
    title="Safely Remove Hardware and Eject Media"
    onclick={() => (open = !open)}
  >
    <Icon name="usb-safe" size={16} />
  </button>
  <ContextMenuStrip {items} bind:open {x} {y} label="Safely Remove Hardware and Eject Media" />
{/if}

<style>
  .usb {
    width: 24px;
    height: 30px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: default;
  }
  .usb:hover,
  .usb.open {
    border-color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.1));
  }
</style>
