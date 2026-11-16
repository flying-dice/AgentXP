<script lang="ts">
  import type { Bounds } from '@shared/desktop'
  import type { AppProps } from '../types'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ToolStripDropDownButton from '../../kit/molecules/ToolStripDropDownButton.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { getDesktopContext } from '../../desktop/context'
  import type { DesktopController } from '../../desktop/DesktopController.svelte'

  let { window: win, host }: AppProps<'snipping-tool'> = $props()

  type Mode = 'rect' | 'window' | 'full'

  // The overlay lives on the desktop page; without one (stories) the tool captures a fixed region.
  // svelte-ignore state_referenced_locally
  const desktop: DesktopController | null = (() => {
    try {
      return getDesktopContext().desktop
    } catch {
      return null
    }
  })()

  let image = $state<string | null>(null)
  let size = $state<{ width: number; height: number } | null>(null)
  let status = $state('Click New to capture a snip.')
  let busy = $state(false)
  let delay = $state(0)
  let options = $state(false)
  let counter = 0

  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

  async function snip(mode: Mode): Promise<void> {
    if (busy) return
    busy = true
    try {
      let region: Bounds | undefined
      if (mode !== 'full') {
        status = mode === 'rect' ? 'Drag to select the area to capture.' : 'Click the window to capture.'
        const picked = desktop ? await desktop.pickSnipRegion(mode) : ({ x: 100, y: 100, width: 240, height: 140 } satisfies Bounds)
        if (!picked) {
          status = 'Snip cancelled.'
          return
        }
        region = picked
      }
      // Get this window out of the picture, let the overlay and animations settle.
      const minimized = desktop && win.windowState !== 'minimized'
      if (minimized) await desktop.minimize(win.id)
      await wait(300 + delay * 1000)
      try {
        image = await host.api.snip.capture(host.state.desktopId, region)
        counter++
        size = region ? { width: region.width, height: region.height } : null
        status = region ? `Captured ${region.width} × ${region.height}.` : 'Captured the whole desktop.'
        host.updateView(win.id, { app: 'snipping-tool', lastSnipId: `snip-${Date.now().toString(36)}-${counter}` })
      } finally {
        if (minimized) await desktop.focusWindow(win.id)
      }
    } catch (error) {
      status = 'The snip failed.'
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Snipping Tool', buttons: 'OK', icon: 'error' })
    } finally {
      busy = false
    }
  }

  function cancel(): void {
    desktop?.snipOverlay?.resolve(null)
  }

  async function copy(): Promise<void> {
    if (!image) return
    try {
      const blob = await (await fetch(image)).blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
      status = 'Copied to the clipboard.'
    } catch {
      status = 'The snip could not be copied.'
    }
  }

  /**
   * "Send to chat": the chat composer takes files, not picture data, so the snip is saved as a PNG on C: (C:\Users\Agent\Pictures\Snips)
   * and attached as a file. The chat pane of this window opens and gets it with a short note.
   */
  async function sendToChat(): Promise<void> {
    if (!image) return
    try {
      const saved = await host.api.snip.save(host.state.desktopId, image)
      await host.sendFileToChat(win.id, saved.filePath, `Here is a snip I took. It is saved as ${saved.path}. Please look at it; I will tell you what I need next.`)
      status = `Sent to chat. The picture is saved as ${saved.path}.`
    } catch {
      status = 'The snip could not be sent to chat.'
    }
  }

  const newItems = $derived<MenuItemDef[]>([
    { label: '&Rectangular Snip', action: () => void snip('rect') },
    { label: '&Window Snip', action: () => void snip('window') },
    { label: '&Full-screen Snip', action: () => void snip('full') }
  ])
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'snipping-tool')
  const ctx = new ContextMenu()

  // The chat pane knows whether there is a snip.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ hasSnip: !!image }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new', testid: 'snipping-tool-menu-new', label: '&New Snip', shortcut: 'Ctrl+N', disabled: busy, action: () => void snip('rect') },
          { id: 'window', testid: 'snipping-tool-menu-window', label: '&Window Snip', disabled: busy, action: () => void snip('window') },
          { id: 'full', testid: 'snipping-tool-menu-full', label: '&Full-screen Snip', disabled: busy, action: () => void snip('full') },
          ...closeItems('snipping-tool', () => void host.closeWindow(win.id))
        ]
      },
      { label: '&Edit', items: [{ id: 'send-chat', testid: 'snipping-tool-menu-send-chat', label: 'Send to &chat (saves a picture)', disabled: !image, action: () => void sendToChat() }, { id: 'copy', testid: 'snipping-tool-menu-copy', label: '&Copy', shortcut: 'Ctrl+C', disabled: !image, action: () => void copy() }] },
      {
        label: '&Tools',
        items: [
          { id: 'cancel', testid: 'snipping-tool-menu-cancel', label: 'C&ancel Snip', shortcut: 'Esc', disabled: !busy, action: cancel },
          { id: 'options', testid: 'snipping-tool-menu-options', label: '&Options...', action: () => (options = true) }
        ]
      },
      help.viewMenu(win.id),
      help.menu()
    ])
  )

  /** The buttons of the toolbar: New Snip, Copy, Options. */
  const contextItems = (): MenuItemDef[] => [
    { id: 'snipping-tool-ctx-copy', testid: 'snipping-tool-ctx-copy', label: '&Copy', icon: 'copy', disabled: !image, action: () => void copy() },
    { id: 'snipping-tool-ctx-send-chat', testid: 'snipping-tool-ctx-send-chat', label: 'Send to &chat (saves a picture)', icon: 'agent', disabled: !image, action: () => void sendToChat() },
    { separator: true },
    { id: 'snipping-tool-ctx-new', testid: 'snipping-tool-ctx-new', label: '&New Snip', icon: 'scissors', disabled: busy, action: () => void snip('rect') },
    { id: 'snipping-tool-ctx-options', testid: 'snipping-tool-ctx-options', label: '&Options...', icon: 'options', action: () => (options = true) }
  ]

  const delays = [0, 1, 3, 5].map((s) => ({ value: String(s), label: s === 0 ? 'No delay' : `${s} second${s === 1 ? '' : 's'}` }))
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="sn" data-testid="snipping-tool-app" oncontextmenu={(e) => ctx.show(e, contextItems())} onkeydown={(e) => ctx.key(e, contextItems)}>
  <MenuStrip {menus} aria-label="Snipping Tool menu" />
  <ToolStrip aria-label="Snipping Tool">
    <ToolStripButton data-testid="snipping-tool-new" icon="scissors" text="New" disabled={busy} onclick={() => void snip('rect')} />
    <ToolStripDropDownButton text="▾" title="Snip type" items={newItems} disabled={busy} />
    <ToolStripButton icon="close" text="Cancel" disabled={!busy} onclick={cancel} />
    <ToolStripButton icon="options" text="Options" onclick={() => (options = true)} />
    {#snippet trailing()}
      <ToolStripButton data-testid="snipping-tool-send-chat" icon="agent" text="Send to chat" title="Saves the snip as a picture in Pictures\Snips in the Agent folder on C: and sends it to the chat" disabled={!image} onclick={() => void sendToChat()} />
      <ToolStripButton icon="copy" text="Copy" disabled={!image} onclick={() => void copy()} />
    {/snippet}
  </ToolStrip>
  <div class="view w7-scroll" aria-label="Snip">
    {#if image}
      <img src={image} alt="The last snip" width={size?.width} height={size?.height} />
    {:else}
      <p class="empty">Select the snip type using the New button, or click New for a rectangular snip.</p>
    {/if}
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={status} spring />
    {#if delay > 0}<StatusStripLabel text="Delay: {delay} s" borders={['left']} width={90} />{/if}
  </StatusStrip>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Snipping Tool" />
  <AppAbout {help} />
  {#if options}
    <Dialog title="Snipping Tool Options" iconName="options" width="340px" contained onclose={() => (options = false)}>
      <div class="opts">
        <span>Delay before the capture:</span>
        <ComboBox aria-label="Delay" items={delays} value={String(delay)} onchange={(v) => (delay = Number(v))} />
        <p class="note">Send to chat saves the snip as a picture in C:\Users\Agent\Pictures\Snips and attaches it to the chat.</p>
      </div>
      {#snippet buttons()}
        <DialogButtons buttons={['ok']} onresult={() => (options = false)} />
      {/snippet}
    </Dialog>
  {/if}
</div>

<style>
  .sn {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .view {
    flex: 1;
    min-height: 0;
    margin: 6px;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
    display: flex;
  }
  img {
    display: block;
    margin: auto;
    max-width: none;
    box-shadow: 0 0 0 1px #888;
  }
  .empty {
    margin: auto;
    padding: 10px 16px;
    max-width: 320px;
    color: var(--w7-text-muted);
    text-align: center;
  }
  .opts {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
  }
  .note {
    margin: 6px 0 0;
    color: var(--w7-text-muted);
  }
</style>
