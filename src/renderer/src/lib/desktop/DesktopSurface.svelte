<script lang="ts">
  import type { IconName } from '../kit/atoms/icons'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuItemDef } from '../kit/molecules/MenuItem'
  import DesktopIcon from '../kit/molecules/DesktopIcon.svelte'

  export interface DesktopIconDef {
    id: string
    label: string
    icon: IconName
    /** Tooltip: what the icon opens. */
    title?: string
  }

  interface Props {
    icons: DesktopIconDef[]
    selected: string | null
    infopanels: boolean
    onselect?: (id: string | null) => void
    onopen?: (id: string) => void
    onnewchat?: () => void
    onopencomputer?: () => void
    ontoggleinfopanels?: () => void
    oncontrolcentre?: () => void
    /** Any press on the bare desktop (closes popups). */
    onbackground?: () => void
  }

  let { icons, selected, infopanels, onselect, onopen, onnewchat, onopencomputer, ontoggleinfopanels, oncontrolcentre, onbackground }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let menuOpen = $state(false)
  let menuX = $state(0)
  let menuY = $state(0)

  const menu = $derived<MenuItemDef[]>([
    { id: 'desktop-new-chat', label: 'New &chat', icon: 'session', action: () => onnewchat?.() },
    { id: 'desktop-open-computer', label: 'Open &Computer', icon: 'computer', action: () => onopencomputer?.() },
    { separator: true },
    { id: 'desktop-infopanels', label: '&InfoPanels', checked: infopanels, action: () => ontoggleinfopanels?.() },
    { id: 'desktop-control-centre', label: 'Control &Centre', icon: 'options', action: () => oncontrolcentre?.() }
  ])

  function onContext(event: MouseEvent): void {
    event.preventDefault()
    onselect?.(null)
    menuX = event.clientX
    menuY = event.clientY
    menuOpen = true
  }

  function onKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    if (!keys.includes(event.key)) return
    const buttons = Array.from(root?.querySelectorAll<HTMLButtonElement>('[data-desktop-icon]') ?? [])
    if (buttons.length === 0) return
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const rows = Math.max(1, Math.floor((root?.clientHeight ?? 400) / 88))
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' ? -rows : rows
    event.preventDefault()
    buttons[Math.max(0, Math.min(buttons.length - 1, (at < 0 ? 0 : at + step)))]?.focus()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div
  class="surface"
  bind:this={root}
  role="group"
  aria-label="Desktop"
  data-region="icons"
  onpointerdown={(e) => {
    if (e.target === root) {
      onselect?.(null)
      onbackground?.()
    }
  }}
  oncontextmenu={onContext}
  onkeydown={onKeydown}
>
  {#each icons as icon (icon.id)}
    <DesktopIcon testid="desktop-icon-{icon.id}" label={icon.label} title={icon.title} icon={icon.icon} selected={selected === icon.id} onselect={() => onselect?.(icon.id)} onopen={() => onopen?.(icon.id)} oncontextmenu={() => {}} />
  {/each}
</div>
<ContextMenuStrip items={menu} bind:open={menuOpen} x={menuX} y={menuY} label="Desktop" />

<style>
  .surface {
    position: absolute;
    inset: 0;
    padding: 8px;
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(auto-fill, 88px);
    grid-auto-columns: 88px;
    align-content: start;
    justify-content: start;
    gap: 4px 2px;
  }
</style>
