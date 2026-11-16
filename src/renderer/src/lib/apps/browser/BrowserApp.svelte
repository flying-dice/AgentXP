<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import { registerAppRequestHandler } from '../appRequests'
  import Icon from '../../kit/atoms/Icon.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { copyText } from '../shared/contextItems'
  import { selectionContext, useAppContext } from '../shared/appContext.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { ViewSync } from '../viewSync'
  import { BLANK, inElectron, isSecure, normalizeAddress } from './address'
  import BrowserTabPage from './BrowserTab.svelte'
  import type { PageContext } from './webview'
  import { closeTab, newTabState, parseTabsRequest, tabInfos, tabLabel, type BrowserTabState } from './tabs'

  let { window: win, host }: AppProps<'browser'> = $props()

  const electron = inElectron()
  // svelte-ignore state_referenced_locally
  const firstUrl = win.view.url || BLANK

  // svelte-ignore state_referenced_locally
  let tabs = $state.raw<BrowserTabState[]>([{ ...newTabState(1, firstUrl), title: win.view.title }])
  let activeId = $state(1)
  let nextId = 2
  // svelte-ignore state_referenced_locally
  let address = $state(firstUrl === BLANK ? '' : firstUrl)
  const pages = $state<Record<number, BrowserTabPageApi | undefined>>({})
  /** The guest page of each tab (`webContents` id), for main to drive. */
  const guests = new Map<number, number>()
  const waiters = new Map<number, (() => void)[]>()
  /** The tab main drives right now. */
  let attachedTo = 0

  type BrowserTabPageApi = { navigate(url: string): void; step(delta: -1 | 1): void; reload(): void; stop(): void }

  const active = $derived(tabs.find((t) => t.id === activeId) ?? tabs[0])
  const sync = new ViewSync<{ url: string }>((v) => v.url)

  // The agent working on the page: the bar and the ring around its target.
  let activity = $state<string | null>(null)
  let ring = $state<{ x: number; y: number; width: number; height: number } | null>(null)
  let activityTimer: ReturnType<typeof setTimeout> | undefined
  let ringTimer: ReturnType<typeof setTimeout> | undefined

  function report(): void {
    const t = active
    if (sync.mark({ url: t.url })) host.updateView(win.id, { app: 'browser', url: t.url, title: t.title, loading: t.loading })
    else if (win.view.title !== t.title || win.view.loading !== t.loading) host.updateView(win.id, { app: 'browser', url: t.url, title: t.title, loading: t.loading })
  }

  function patch(id: number, change: Partial<BrowserTabState>): void {
    const before = tabs.find((t) => t.id === id)
    if (!before) return
    tabs = tabs.map((t) => (t.id === id ? { ...t, ...change } : t))
    if (id !== activeId) return
    if (change.url !== undefined && change.url !== before.url) address = change.url === BLANK ? '' : change.url
    report()
  }

  /** Tells main which guest page is the active tab. Resolves when main knows it. */
  async function attach(id: number): Promise<void> {
    const guest = guests.get(id)
    if (!guest) return
    const desktop = host.api.desktop as unknown as { attachBrowser?: (windowId: number, webContentsId: number) => Promise<unknown> | unknown }
    await desktop.attachBrowser?.(win.id, guest)
  }

  async function ready(id: number, webContentsId: number): Promise<void> {
    if (webContentsId) guests.set(id, webContentsId)
    if (id === activeId) {
      await attach(id).catch(() => {})
      attachedTo = id
    }
    for (const resolve of waiters.get(id) ?? []) resolve()
    waiters.delete(id)
  }

  /** Resolves once the tab's page is attached (or after a few seconds, so a request never hangs). */
  const whenReady = (id: number): Promise<void> =>
    new Promise((resolve) => {
      const done = (): void => resolve()
      if (!electron || attachedTo === id) return done()
      waiters.set(id, [...(waiters.get(id) ?? []), done])
      setTimeout(done, 5000)
    })

  async function select(id: number): Promise<void> {
    if (!tabs.some((t) => t.id === id)) return
    activeId = id
    const t = tabs.find((x) => x.id === id)!
    address = t.url === BLANK ? '' : t.url
    sync.mark({ url: t.url })
    host.updateView(win.id, { app: 'browser', url: t.url, title: t.title, loading: t.loading })
    await attach(id).catch(() => {})
    if (guests.has(id)) attachedTo = id
  }

  function openTab(url: string = BLANK): number {
    const id = nextId++
    tabs = [...tabs, newTabState(id, url)]
    activeId = id
    address = url === BLANK ? '' : url
    sync.mark({ url })
    host.updateView(win.id, { app: 'browser', url, title: '', loading: url !== BLANK })
    return id
  }

  function closeAt(id: number): void {
    const result = closeTab(tabs, activeId, id, nextId)
    if (result.replaced) nextId++
    tabs = result.tabs
    delete pages[id]
    guests.delete(id)
    if (result.activeId !== activeId || result.replaced) void select(result.activeId)
  }

  function navigate(target: string): void {
    address = target === BLANK ? '' : target
    pages[activeId]?.navigate(target)
  }

  const go = (): void => navigate(normalizeAddress(address))

  // The agent navigates (browser_navigate) or the shell restores the window.
  $effect(() => {
    const incoming = win.view.url
    if (!sync.isExternal({ url: incoming })) return
    const loadingByAgent = win.view.loading
    untrack(() => {
      if (incoming === active.url) return
      // browser_navigate loads the page itself (main) and marks the view as loading: only show the address. A second load
      // of the same address from here would cancel the first and leave the page blank.
      if (loadingByAgent) {
        address = incoming === BLANK ? '' : incoming
        patch(activeId, { url: incoming, loading: true })
      } else navigate(incoming || BLANK)
    })
  })

  async function handle(method: string, params: unknown): Promise<unknown> {
    if (method === 'activity') {
      const p = (params ?? {}) as { label?: string; box?: { x: number; y: number; width: number; height: number } }
      activity = p.label || 'working'
      clearTimeout(activityTimer)
      activityTimer = setTimeout(() => (activity = null), 2500)
      if (p.box) {
        ring = p.box
        clearTimeout(ringTimer)
        ringTimer = setTimeout(() => (ring = null), 1200)
      }
      return { ok: true }
    }
    if (method === 'tabs') {
      const request = parseTabsRequest(params)
      const need = (): number => {
        if (request.tab === undefined) return activeId
        if (!tabs.some((t) => t.id === request.tab)) throw new Error(`There is no tab ${request.tab}. Tabs: ${tabs.map((t) => t.id).join(', ')}.`)
        return request.tab
      }
      let note = ''
      if (request.action === 'new') {
        const id = openTab(request.url)
        await whenReady(id)
        note = `Opened tab ${id}.`
      } else if (request.action === 'switch') {
        const id = need()
        await select(id)
        note = `Switched to tab ${id}.`
      } else if (request.action === 'close') {
        const id = need()
        closeAt(id)
        await whenReady(activeId)
        note = `Closed tab ${id}.`
      }
      return { tabs: tabInfos(tabs, activeId), note: note || undefined }
    }
    throw new Error(`Browser does not know "${method}". Use tabs or activity.`)
  }

  $effect(() => registerAppRequestHandler(win.id, handle))
  $effect(() => () => {
    clearTimeout(activityTimer)
    clearTimeout(ringTimer)
  })

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'browser')
  const ctx = new ContextMenu()

  // The chat pane knows the page. The guest page only reports its selection with a right-click, so that is the selection it gets.
  let pageSelection = ''
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ url: active.url, title: active.title, tabs: tabs.length, ...selectionContext(pageSelection) }))

  const askAboutPage = (selection?: string): void =>
    void host.askChat({ app: 'browser', windowId: win.id, kind: 'ask', url: active.url, title: active.title, ...(selection ? { text: selection } : {}) })

  /** Back, Forward, Reload, Copy link (the page address, or the link under the pointer), Ask chat about this page or selection. */
  const contextItems = (page?: PageContext): MenuItemDef[] => [
    { id: 'browser-ctx-back', testid: 'browser-ctx-back', label: '&Back', icon: 'chevron-left', disabled: !active.canBack, action: () => pages[activeId]?.step(-1) },
    { id: 'browser-ctx-forward', testid: 'browser-ctx-forward', label: '&Forward', icon: 'chevron-right', disabled: !active.canForward, action: () => pages[activeId]?.step(1) },
    { id: 'browser-ctx-reload', testid: 'browser-ctx-reload', label: '&Reload', icon: 'refresh', shortcut: 'F5', action: () => pages[activeId]?.reload() },
    { separator: true },
    { id: 'browser-ctx-copy-link', testid: 'browser-ctx-copy-link', label: 'Copy &link', icon: 'copy', disabled: !page?.linkURL && active.url === BLANK, action: () => copyText(page?.linkURL || active.url) },
    { separator: true },
    { id: 'browser-ctx-ask', testid: 'browser-ctx-ask', label: page?.selectionText ? 'Ask &chat about this...' : 'Ask &chat about this page...', icon: 'session', disabled: active.url === BLANK, action: () => askAboutPage(page?.selectionText) }
  ]

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new-tab', testid: 'browser-menu-new-tab', label: 'New &Tab', shortcut: 'Ctrl+T', action: () => void openTab() },
          { id: 'close-tab', testid: 'browser-menu-close-tab', label: 'Close Ta&b', disabled: tabs.length < 2, action: () => closeAt(activeId) },
          ...closeItems('browser', () => void host.closeWindow(win.id))
        ]
      },
      { label: '&Edit', items: [{ id: 'copy-address', testid: 'browser-menu-copy-address', label: '&Copy page address', disabled: active.url === BLANK, action: () => copyText(active.url) }] },
      {
        label: '&View',
        items: [
          { id: 'refresh', testid: 'browser-menu-refresh', label: '&Refresh', shortcut: 'F5', action: () => pages[activeId]?.reload() },
          { id: 'stop', testid: 'browser-menu-stop', label: '&Stop', shortcut: 'Esc', disabled: !active.loading, action: () => pages[activeId]?.stop() },
          { separator: true },
          { id: 'back', testid: 'browser-menu-back', label: '&Back', shortcut: 'Alt+Left', disabled: !active.canBack, action: () => pages[activeId]?.step(-1) },
          { id: 'forward', testid: 'browser-menu-forward', label: '&Forward', shortcut: 'Alt+Right', disabled: !active.canForward, action: () => pages[activeId]?.step(1) },
          { separator: true },
          help.paneItem(win.id)
        ]
      },
      help.menu()
    ])
  )

  const zone = $derived(active.url.startsWith('file:') || active.url === BLANK ? 'Computer' : 'Internet')
  const status = $derived(active.loading ? `Opening page ${active.url}...` : 'Done')
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="browser" data-testid="browser-app" oncontextmenu={(e) => ctx.show(e, contextItems())} onkeydown={(e) => ctx.key(e, contextItems)}>
  <MenuStrip {menus} aria-label="Browser menu" />
  <div class="chrome">
    <div class="orbs">
      <button class="orb" data-testid="browser-back" aria-label="Back" title="Back" disabled={!active.canBack} onclick={() => pages[activeId]?.step(-1)}><Icon name="chevron-left" size={16} /></button>
      <button class="orb" data-testid="browser-forward" aria-label="Forward" title="Forward" disabled={!active.canForward} onclick={() => pages[activeId]?.step(1)}><Icon name="chevron-right" size={16} /></button>
    </div>
    <form
      class="address"
      onsubmit={(event) => {
        event.preventDefault()
        go()
      }}
    >
      <Icon name={isSecure(active.url) ? 'lock' : 'globe'} />
      <input class="field" data-testid="browser-address" bind:value={address} aria-label="Address" spellcheck="false" placeholder="Type a web address or a search" />
      <button class="mini" data-testid="browser-go" type="submit" aria-label="Go" title="Go to"><Icon name="chevron-right" size={14} /></button>
      {#if active.loading}
        <button class="mini" data-testid="browser-stop" type="button" aria-label="Stop" title="Stop" onclick={() => pages[activeId]?.stop()}><Icon name="close" size={14} /></button>
      {:else}
        <button class="mini" data-testid="browser-refresh" type="button" aria-label="Refresh" title="Refresh" onclick={() => pages[activeId]?.reload()}><Icon name="refresh" size={14} /></button>
      {/if}
    </form>
  </div>
  <div class="tabrow" data-testid="browser-tabs" role="tablist" aria-label="Tabs">
    {#each tabs as tab (tab.id)}
      <div class="tab" class:active={tab.id === activeId} data-testid="browser-tab-{tab.id}" data-active={tab.id === activeId} role="presentation">
        <button class="tabtitle" role="tab" aria-selected={tab.id === activeId} title={tab.url} onclick={() => void select(tab.id)}>
          <Icon name="globe" />
          <span class="label">{tabLabel(tab)}</span>
        </button>
        <button class="tabclose" data-testid="browser-tab-close-{tab.id}" aria-label="Close tab" title="Close tab" onclick={() => closeAt(tab.id)}><Icon name="close" size={10} /></button>
      </div>
    {/each}
    <button class="newtab" data-testid="browser-tab-new" aria-label="New tab" title="New tab" onclick={() => openTab()}><Icon name="plus" size={12} /></button>
  </div>
  <div class="page">
    {#each tabs as tab (tab.id)}
      <BrowserTabPage
        bind:this={pages[tab.id]}
        initialUrl={tab.url}
        {electron}
        active={tab.id === activeId}
        testId="browser-page-{tab.id}"
        onpatch={(change) => patch(tab.id, change)}
        onready={(wc) => void ready(tab.id, wc)}
        oncontext={(info) => ((pageSelection = info.selectionText), ctx.showAt(info.x, info.y, contextItems(info)))}
      />
    {/each}
    {#if activity}
      <div class="agentbar" data-testid="browser-agent-bar" role="status">
        <Icon name="shield" size={12} />
        <span>Agent is using this page: {activity}</span>
        <button class="takeover" data-testid="browser-agent-takeover" onclick={() => void host.api.desktop.setUserInControl(host.state.desktopId, true)}>Take control</button>
      </div>
    {/if}
    {#if ring}
      <div class="ring" data-testid="browser-agent-ring" style:left="{ring.x - 3}px" style:top="{ring.y - 3}px" style:width="{ring.width + 6}px" style:height="{ring.height + 6}px"></div>
    {/if}
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Browser" />
  <AppAbout {help} />
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={status} spring />
    <StatusStripLabel borders={['left']} width={230}>
      <Icon name={zone === 'Internet' ? 'globe' : 'shield'} /> <span>{zone} | Protected Mode: On</span>
    </StatusStripLabel>
    <StatusStripLabel text="100%" borders={['left']} width={56} textAlign="right" />
  </StatusStrip>
</div>

<style>
  .browser {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .chrome {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 8px;
    background: linear-gradient(#e9f0fa, #cbd9ee);
    border-bottom: 1px solid #8ea4c4;
  }
  .orbs {
    display: flex;
    gap: 2px;
  }
  .orb {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid #3b5f8f;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 25%, #ffffff 0, #b9d4f3 45%, #4f87cc 100%);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  }
  .orb:hover:not(:disabled) {
    background: radial-gradient(circle at 35% 25%, #ffffff 0, #d3eaff 45%, #5aa3ea 100%);
  }
  .orb:disabled {
    opacity: 0.45;
    filter: grayscale(0.6);
  }
  .address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 3px 0 5px;
    background: var(--w7-window);
    border: 1px solid #7c93b4;
    border-radius: 2px;
  }
  .address:focus-within {
    border-color: #3399ff;
  }
  .field {
    flex: 1;
    min-width: 0;
    height: 20px;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    user-select: text;
    cursor: text;
  }
  .mini {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
  }
  .mini:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .tabrow {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 26px;
    padding: 0 8px;
    background: linear-gradient(#dfe8f5, #cddbee);
  }
  .tab {
    display: flex;
    align-items: center;
    min-width: 60px;
    max-width: 200px;
    height: 23px;
    overflow: hidden;
    background: linear-gradient(#eef3fb, #d3dff0);
    border: 1px solid #8ea4c4;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    color: #243a5c;
  }
  .tab:hover {
    background: linear-gradient(#f7faff, #dde8f7);
  }
  .tab.active {
    height: 25px;
    background: var(--w7-window);
    color: inherit;
    position: relative;
    z-index: 1;
    margin-bottom: -1px;
  }
  .tabtitle {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    height: 100%;
    padding: 0 4px 0 8px;
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
  }
  .label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tabclose,
  .newtab {
    display: grid;
    place-items: center;
    flex: none;
    width: 16px;
    height: 16px;
    padding: 0;
    margin-right: 3px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
  }
  .tabclose:hover,
  .newtab:hover {
    border-color: #a14444;
    background: linear-gradient(#f9d3d0, #e48a84);
  }
  .newtab {
    width: 22px;
    height: 19px;
    margin: 0 0 2px 2px;
    border-color: #8ea4c4;
    background: linear-gradient(#eef3fb, #d3dff0);
  }
  .newtab:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .page {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    background: var(--w7-window);
    border-top: 1px solid #8ea4c4;
  }
  .agentbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 0 8px;
    background: linear-gradient(#fff6c7, #ffe58a);
    border-bottom: 1px solid #c9a227;
    color: #4a3a00;
    pointer-events: none;
  }
  .agentbar span {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .takeover {
    pointer-events: auto;
    height: 17px;
    padding: 0 8px;
    border: 1px solid #a98a1b;
    border-radius: 2px;
    background: linear-gradient(#fffdf0, #f6df8a);
    font: inherit;
  }
  .ring {
    position: absolute;
    z-index: 4;
    box-sizing: border-box;
    border: 3px solid #ff8a00;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 12px 2px rgba(255, 138, 0, 0.8);
    pointer-events: none;
    animation: ring-fade 1.2s ease-out forwards;
  }
  @keyframes ring-fade {
    0% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
