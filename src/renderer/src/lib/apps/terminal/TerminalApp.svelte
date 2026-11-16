<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import ConsoleView from '../../kit/organisms/ConsoleView.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { ViewSync } from '../viewSync'
  import { collectTerminals, lastLines, renderTerminal, terminalLabel } from './terminalModel'

  let { window: win, host }: AppProps<'terminal'> = $props()

  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const entries = $derived(
    collectTerminals(stores.map((s) => ({ sessionId: s.sessionId, sessionTitle: s.state.session.title || `Chat ${s.sessionId}`, terminals: s.state.terminals })))
  )
  const several = $derived(entries.length > 1)

  /** Key of the shown terminal; null follows the newest one. */
  let chosen = $state<string | null>(null)
  const current = $derived(entries.find((e) => e.key === chosen) ?? entries.at(-1) ?? null)
  /** The working directory of every chat (the terminal runs where its chat works). */
  let cwds = $state.raw<Record<number, string>>({})
  $effect(() => {
    let stale = false
    const load = (): void => void host.api.sessions.list(host.state.desktopId).then((list) => !stale && (cwds = Object.fromEntries(list.map((s) => [s.id, s.cwd]))), () => {})
    load()
    const off = host.api.on('session.changed', load)
    return () => {
      stale = true
      off()
    }
  })
  const cwd = $derived((current && cwds[current.sessionId]) || host.state.home)
  /** Clear view hides what the screen showed so far (the output itself is kept). */
  let cleared = $state<Record<string, number>>({})
  const fullText = $derived(renderTerminal(current, cwd))
  const text = $derived(current ? fullText.slice(Math.min(cleared[current.key] ?? 0, fullText.length)) : fullText)
  let screen = $state<HTMLElement | null>(null)

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'terminal')
  const ctx = new ContextMenu()
  const clearView = (): void => {
    if (current) cleared = { ...cleared, [current.key]: fullText.length }
  }
  const copy = (): void => void document.execCommand('copy')
  const selectAll = (): void => {
    const out = screen?.querySelector('.out') ?? screen
    if (out) window.getSelection()?.selectAllChildren(out)
  }
  const selectedText = (): string => {
    const sel = window.getSelection()
    return sel && !sel.isCollapsed && sel.anchorNode && screen?.contains(sel.anchorNode) ? sel.toString() : ''
  }

  const contextItems = (): MenuItemDef[] => {
    const selected = selectedText()
    return [
      ...editItems('terminal-ctx', { copy, selectAll }, { hasSelection: selected !== '' }),
      { id: 'terminal-ctx-clear', testid: 'terminal-ctx-clear', label: 'C&lear view', icon: 'delete', action: clearView },
      { separator: true },
      {
        id: 'terminal-ctx-ask',
        testid: 'terminal-ctx-ask',
        label: 'Ask &chat about this output...',
        icon: 'session',
        action: () => void host.askChat({ app: 'terminal', windowId: win.id, kind: 'ask', text: selected || text.trim().split('\n').slice(-40).join('\n') })
      }
    ]
  }

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: closeItems('terminal', () => void host.closeWindow(win.id)).slice(1) },
      { label: '&Edit', items: [...editItems('terminal-menu', { copy, selectAll }, { hasSelection: true }), { separator: true }, { id: 'clear', testid: 'terminal-menu-clear', label: 'C&lear view', action: clearView }] },
      help.menu()
    ])
  )

  const sync = new ViewSync<{ terminalId: string | null }>((v) => String(v.terminalId))

  // The agent picks a terminal by its id.
  $effect(() => {
    const id = win.view.terminalId
    if (!sync.isExternal({ terminalId: id })) return
    untrack(() => {
      const found = id === null ? undefined : entries.find((e) => e.terminalId === id)
      if (found) chosen = found.key
    })
  })

  // Report what is on screen (the shell debounces).
  $effect(() => {
    const view = {
      terminalId: current?.terminalId ?? null,
      cwd,
      runningCommand: current?.running ? current.command : null,
      lastLines: current ? lastLines(current.output, 20) : []
    }
    const known = untrack(() => win.view)
    if (
      known.terminalId === view.terminalId &&
      known.cwd === view.cwd &&
      known.runningCommand === view.runningCommand &&
      JSON.stringify(known.lastLines) === JSON.stringify(view.lastLines)
    )
      return
    sync.mark({ terminalId: view.terminalId })
    host.updateView(win.id, { app: 'terminal', ...view })
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="terminal" data-testid="terminal-app" oncontextmenu={(e) => ctx.show(e, contextItems())} onkeydown={(e) => ctx.key(e, contextItems)}>
  <MenuStrip {menus} aria-label="Terminal menu" />
  <div class="head">
    <span class="title">Agent7 shell - cmd.exe</span>
    <span class="spring"></span>
    {#if several}
      <span>Terminal:</span>
      <ComboBox
        aria-label="Terminal"
        testid="terminal-picker"
        items={entries.map((e) => ({ value: e.key, label: terminalLabel(e, true) }))}
        value={current?.key ?? ''}
        onchange={(key) => (chosen = key)}
        style="width:260px"
      />
    {/if}
  </div>
  <div class="screen" data-testid="terminal-output" data-running={current?.running ?? false} bind:this={screen}>
    <ConsoleView {text} running={current?.running ?? false} label="Agent7 shell" />
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Terminal" />
  <AppAbout {help} />
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text="Read-only: the agent is the only user of this shell. You can watch, not type." spring />
    <StatusStripLabel testid="terminal-status" text={current ? (current.running ? 'Running' : `Exit code ${current.exitCode}`) : 'No terminals'} borders={['left']} width={110} />
  </StatusStrip>
</div>

<style>
  .terminal {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .title {
    font-weight: 700;
  }
  .spring {
    flex: 1;
  }
  .screen {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-console-bg);
  }
  .screen :global(.w7-console) {
    flex: 1;
    border: 0;
  }
  .screen :global(.out) {
    font-family: 'Lucida Console', Consolas, 'DejaVu Sans Mono', monospace;
  }
</style>
