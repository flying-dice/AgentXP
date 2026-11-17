<script lang="ts">
  /**
   * The "Safely Remove Hardware and Eject Media" tray icon: a USB stick with a green tick. Click opens
   * a menu with one "Eject <drive>" entry per plugged-in project. Hidden while no USB drive is plugged in.
   */
  import type { Id } from '@shared/models'
  import type { DriveDto } from '@shared/vfs'
  import Icon from '../kit/atoms/Icon.svelte'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuItemDef } from '../kit/molecules/MenuItem'
  import { driveTitle, sortDrives } from '../apps/explorer/explorerModel'
  import { projectCountText } from '../apps/explorer/explorerContext'
  import { plugAgainLabel, type RemovedProject } from './projectDrives'

  interface Props {
    drives: DriveDto[]
    open?: boolean
    oneject?: (letter: string) => void
    /** Projects removed from the desktop, newest first: each gets a "Plug in ... again" entry after the eject entries. */
    removed?: readonly (RemovedProject & { letter?: string })[]
    onplugagain?: (folderId: Id) => void
    element?: HTMLButtonElement | null
  }

  let { drives, open = $bindable(false), oneject, removed = [], onplugagain, element = $bindable(null) }: Props = $props()

  const usb = $derived(sortDrives(drives).filter((d) => d.kind === 'removable'))
  const ejectItems = $derived<MenuItemDef[]>(usb.map((d) => ({ testid: `usb-eject-${d.letter.toLowerCase()}`, label: `Eject ${driveTitle(d).replaceAll('&', '&&')} (remove from this desktop)`, icon: 'usb', action: () => oneject?.(d.letter) })))
  const againItems = $derived<MenuItemDef[]>(removed.map((p) => ({ testid: 'usb-plug-again', label: plugAgainLabel(p).replaceAll('&', '&&'), icon: 'usb', action: () => onplugagain?.(p.folderId) })))
  const items = $derived<MenuItemDef[]>(againItems.length > 0 && ejectItems.length > 0 ? [...ejectItems, { separator: true }, ...againItems] : [...ejectItems, ...againItems])
  /** `Safely Remove Hardware: 1 project plugged in`. */
  const tip = $derived(`Safely Remove Hardware: ${projectCountText(usb.length)}`)
  let x = $state(0)
  let y = $state(0)

  // Position the popup upwards from the icon whenever it opens (also when opened from outside).
  $effect(() => {
    if (!open || !element) return
    const r = element.getBoundingClientRect()
    const barTop = element.closest('.xp-taskbar')?.getBoundingClientRect().top ?? r.top
    x = r.left - 8
    // The popup sits on top of the taskbar: about 24 px per entry plus the popup frame.
    y = barTop - items.length * 24 - 12
  })
</script>

{#if usb.length > 0 || removed.length > 0}
  <button
    bind:this={element}
    type="button"
    class="usb"
    data-testid="usb-tray"
    class:open
    aria-label={tip}
    aria-haspopup="menu"
    aria-expanded={open}
    title={tip}
    onclick={() => (open = !open)}
  >
    <Icon name="usb-safe" size={16} />
  </button>
  <ContextMenuStrip {items} bind:open {x} {y} label={tip} />
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
