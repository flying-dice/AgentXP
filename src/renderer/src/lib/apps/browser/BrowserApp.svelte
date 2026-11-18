<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import { registerAppRequestHandler } from '../appRequests'
  import Button from '../../kit/atoms/Button.svelte'
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
  import ToolTip from '../../kit/atoms/ToolTip.svelte'
  import BrowserTabPage from './BrowserTab.svelte'
  import type { PageContext } from './webview'
  import { agentBarText, ASK_ABOUT_PAGE_QUESTION, ASSISTANT_TOOLTIP, assistantStatus, GIVE_BACK_BUTTON_TIP, pageStatus, READ_DONE_MS, STOPPED_MS, TAKE_OVER_BUTTON_TIP, zoomText } from './pageStatus'
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
  /**
   * The bar stays this long after the agent's last announcement. Main announces every browser tool, reads included, and
   * repeats the announcement while one runs, so the bar stays up for the whole job and goes 20 seconds after the last step.
   */
  const ACTIVITY_MS = 20000

  type BrowserTabPageApi = { navigate(url: string): void; step(delta: -1 | 1): void; reload(): void; stop(): void; zoomBy(direction: -1 | 0 | 1): void }

  const active = $derived(tabs.find((t) => t.id === activeId) ?? tabs[0])
  const sync = new ViewSync<{ url: string }>((v) => v.url)

  // The agent working on the page: the bar and the ring around its target.
  let activity = $state<string | null>(null)
  /** The agent is reading the page right now (the status bar says "Agent: reading"). */
  let reading = $state(false)
  /** What the agent is waiting for, for the tooltip of the bar ("Waiting for the text ... to show on the page."). */
  let activityDetail = $state<string | null>(null)
  /** The agent finished reading the page: the bar says "The agent read this page." until it goes. */
  let readDone = $state(false)
  /** The address of the page that the agent read (the status bar says so while that page is open). */
  let readUrl = $state<string | null>(null)
  /** The user took control while the agent worked: the bar stays, with Resume, until the user gives it back. */
  let engaged = $state(false)
  /** The agent's last action was a moment ago: the bar says it stopped, for STOPPED_MS (UX-214). */
  let stopped = $state(false)
  let stoppedTimer: ReturnType<typeof setTimeout> | undefined
  let ring = $state<{ x: number; y: number; width: number; height: number } | null>(null)
  let activityTimer: ReturnType<typeof setTimeout> | undefined
  let ringTimer: ReturnType<typeof setTimeout> | undefined

  function report(): void {
    const t = active
    if (sync.report({ url: t.url })) host.updateView(win.id, { app: 'browser', url: t.url, title: t.title, loading: t.loading })
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

  /** Left and Right move between the tabs (the tab list keeps one tab stop, on the active tab). */
  function tabKey(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const at = tabs.findIndex((t) => t.id === activeId)
    const next = tabs[(at + step + tabs.length) % tabs.length]
    void select(next.id).then(() => document.querySelector<HTMLElement>(`[data-testid="browser-tab-${next.id}"]`)?.focus())
  }

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

  /** The bar goes. At the end of a turn (`all` false) a finished read keeps its message until its own timer ends it. */
  function stopActivity(all: boolean): void {
    if (!all && readDone) return
    clearTimeout(activityTimer)
    // The bar does not vanish: it says the agent stopped, then goes after a few seconds (a finished read has its own message).
    if (activity !== null && !readDone) {
      stopped = true
      clearTimeout(stoppedTimer)
      stoppedTimer = setTimeout(() => (stopped = false), STOPPED_MS)
    }
    activity = null
    reading = false
    activityDetail = null
    readDone = false
  }

  async function handle(method: string, params: unknown): Promise<unknown> {
    if (method === 'activity') {
      const p = (params ?? {}) as { label?: string; detail?: string; reading?: boolean; read?: boolean; box?: { x: number; y: number; width: number; height: number } }
      // The agent's actions never move the operator's view (docs/AGENT_PRESENCE.md): the window stays where it is; the
      // yellow bar shows the step to whoever looks, and the chat row's Show in Browser brings it forward.
      stopped = false
      clearTimeout(stoppedTimer)
      activity = p.label || 'working'
      reading = p.reading === true
      activityDetail = p.detail ?? null
      if (p.read === true) readUrl = active.url
      // A finished read says so and goes after a few seconds, unless the agent starts another step (UX-128).
      readDone = p.read === true
      engaged = true
      clearTimeout(activityTimer)
      activityTimer = setTimeout(() => stopActivity(true), readDone ? READ_DONE_MS : ACTIVITY_MS)
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
  // The turn ended: the yellow bar goes at once (the timer is only the fallback). "The agent read this page." keeps its few seconds (UX-156).
  let wasBusy = false
  $effect(() => {
    const busy = host.agentBusy
    const ended = wasBusy && !busy
    wasBusy = busy
    if (ended) untrack(() => stopActivity(false))
  })
  // The bar after the agent's last step only stays for a user who has taken control.
  $effect(() => {
    if (!userInControl && activity === null) engaged = false
  })
  $effect(() => () => {
    clearTimeout(activityTimer)
    clearTimeout(ringTimer)
    clearTimeout(stoppedTimer)
  })

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'browser')
  const ctx = new ContextMenu()

  // The chat pane knows the page. The guest page only reports its selection with a right-click, so that is the selection it gets.
  let pageSelection = ''
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ url: active.url, title: active.title, tabs: tabs.length, ...selectionContext(pageSelection) }))

  const askAboutPage = (selection?: string): void =>
    void host.askChat({ app: 'browser', windowId: win.id, kind: 'ask', url: active.url, title: active.title, ...(selection ? { text: selection } : { question: ASK_ABOUT_PAGE_QUESTION }) })

  /** Back, Forward, Reload, Copy link (the page address, or the link under the pointer), Ask the agent about this page or selection. */
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
          { id: 'zoom-in', testid: 'browser-menu-zoom-in', label: 'Zoom &in', shortcut: 'Ctrl++', action: () => pages[activeId]?.zoomBy(1) },
          { id: 'zoom-out', testid: 'browser-menu-zoom-out', label: 'Zoom &out', shortcut: 'Ctrl+-', action: () => pages[activeId]?.zoomBy(-1) },
          { id: 'zoom-reset', testid: 'browser-menu-zoom-reset', label: '&Actual size', shortcut: 'Ctrl+0', action: () => pages[activeId]?.zoomBy(0) },
          { separator: true },
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
  const status = $derived(pageStatus({ url: active.url, loading: active.loading, failed: active.failed }))
  const userInControl = $derived(host.state.userInControl)
  const setControl = (on: boolean): void => void host.api.desktop.setUserInControl(host.state.desktopId, on)
  const assistant = $derived(assistantStatus(host.state.policy?.groups.browser ?? 'allow', reading, readUrl !== null && readUrl === active.url))

  /** Ctrl+Plus, Ctrl+Minus and Ctrl+0 zoom the page (the guest page keeps its own keys when it has focus). */
  function zoomKey(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey) return
    const direction = event.key === '+' || event.key === '=' ? 1 : event.key === '-' ? -1 : event.key === '0' ? 0 : null
    if (direction === null) return
    event.preventDefault()
    pages[activeId]?.zoomBy(direction)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="browser" data-testid="browser-app" oncontextmenu={(e) => ctx.show(e, contextItems())} onkeydown={(e) => (zoomKey(e), ctx.key(e, contextItems))}>
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
    <Button data-testid="browser-ask-page" icon="session" disabled={active.url === BLANK} title="Open the chat and ask the agent about this page." onclick={() => askAboutPage()}>Ask about this page</Button>
  </div>
  <div class="tabrow">
    <div class="tabs">
      <div class="tablist" data-testid="browser-tabs" role="tablist" aria-label="Tabs" tabindex="-1" onkeydown={tabKey}>
        {#each tabs as tab (tab.id)}
          <button
            class="tab"
            class:active={tab.id === activeId}
            data-testid="browser-tab-{tab.id}"
            data-active={tab.id === activeId}
            role="tab"
            aria-selected={tab.id === activeId}
            tabindex={tab.id === activeId ? 0 : -1}
            title={tab.url}
            onclick={() => void select(tab.id)}
          >
            <Icon name="globe" />
            <span class="label" title={tabLabel(tab)}>{tabLabel(tab)}</span>
          </button>
        {/each}
      </div>
      <!-- The close buttons are not inside the tab list (a tab holds no buttons); each sits over the right end of its tab. -->
      <div class="closes">
        {#each tabs as tab (tab.id)}
          <div class="slot">
            <button class="tabclose" data-testid="browser-tab-close-{tab.id}" aria-label="Close tab: {tabLabel(tab)}" title="Close tab" onclick={() => closeAt(tab.id)}><span class="x"><Icon name="close" size={10} /></span></button>
          </div>
        {/each}
      </div>
    </div>
    <ToolTip text="New tab" delay={300}>
      <button class="newtab" data-testid="browser-tab-new" aria-label="New tab" onclick={() => openTab()}><Icon name="plus" size={12} /></button>
    </ToolTip>
  </div>
  <!-- The bar sits above the page, not over it: no text of the page is covered (UX-214). -->
  {#if activity !== null || engaged || stopped}
    <div class="agentbar" data-testid="browser-agent-bar" data-taken-over={userInControl} role="status">
      <Icon name="shield" size={12} />
      <span data-testid="browser-agent-bar-text" title={activityDetail ?? undefined}
        >{agentBarText({ userInControl, readDone, activity, stopped })}</span
      >
      {#if userInControl}
        <button class="bar-button takeover" data-testid="browser-agent-giveback" title={GIVE_BACK_BUTTON_TIP} onclick={() => setControl(false)}>Give back</button>
      {:else if !stopped || activity !== null}
        <button class="bar-button takeover" data-testid="browser-agent-takeover" title={TAKE_OVER_BUTTON_TIP} onclick={() => setControl(true)}>Take over</button>
      {/if}
    </div>
  {/if}
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
        onhelp={() => help.openSection('troubleshooting')}
        oncontext={(info) => ((pageSelection = info.selectionText), ctx.showAt(info.x, info.y, contextItems(info)))}
      />
    {/each}
    {#if ring}
      <div class="ring" data-testid="browser-agent-ring" style:left="{ring.x - 3}px" style:top="{ring.y - 3}px" style:width="{ring.width + 6}px" style:height="{ring.height + 6}px"></div>
    {/if}
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Browser" />
  <AppAbout {help} />
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={status} spring />
    <StatusStripLabel borders={['left']} width={130}>
      <Icon name={zone === 'Internet' ? 'globe' : 'shield'} /> <span>{zone}</span>
    </StatusStripLabel>
    <StatusStripLabel testid="browser-assistant-status" borders={['left']} width={190}>
      <span class="t" title={ASSISTANT_TOOLTIP}>{assistant}</span>
    </StatusStripLabel>
    <StatusStripLabel text={zoomText(active.zoom)} borders={['left']} width={56} textAlign="right" />
  </StatusStrip>
</div>

<style>
  .browser {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
  }
  .chrome {
    flex: none;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px 8px;
    min-height: 36px;
    box-sizing: border-box;
    padding: 3px 8px;
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
    flex: 1 1 160px;
    min-width: 120px;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 3px 0 5px;
    background: var(--xp-window);
    border: 1px solid #7c93b4;
    border-radius: 2px;
  }
  .address:focus-within {
    border-color: #316ac5;
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
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  .tabrow {
    flex: none;
    display: flex;
    align-items: flex-end;
    height: 26px;
    padding: 0 8px;
    background: linear-gradient(#dfe8f5, #cddbee);
  }
  .tabs {
    position: relative;
    display: flex;
    align-items: flex-end;
    min-width: 0;
    height: 100%;
  }
  .tablist,
  .closes {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
  }
  /* The close buttons lie over the tabs: both rows give every item the same width, so each button meets its tab. */
  .closes {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .tab,
  .slot {
    flex: 0 1 170px;
    /* Room for 14 characters beside the icon and the close button: a short title is never cut (UX-135). */
    min-width: 150px;
    box-sizing: border-box;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 23px;
    padding: 0 28px 0 8px;
    overflow: hidden;
    background: linear-gradient(#eef3fb, #d3dff0);
    border: 1px solid #8ea4c4;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    color: #243a5c;
    font: inherit;
    text-align: left;
  }
  .tab:hover {
    background: linear-gradient(#f7faff, #dde8f7);
  }
  .tab.active {
    height: 25px;
    background: var(--xp-window);
    color: inherit;
    position: relative;
    z-index: 1;
    margin-bottom: -1px;
  }
  .slot {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 24px;
    padding-right: 1px;
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
    padding: 0;
    border: 0;
    background: transparent;
  }
  /* A 24 x 24 px target around a 16 x 16 px look. */
  .tabclose {
    width: 24px;
    height: 24px;
    pointer-events: auto;
  }
  .x {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border: 1px solid transparent;
    border-radius: 2px;
  }
  .tabclose:hover .x {
    border-color: #a14444;
    background: linear-gradient(#f9d3d0, #e48a84);
  }
  .newtab {
    width: 24px;
    height: 22px;
    margin: 0 0 2px 2px;
    border: 1px solid #8ea4c4;
    border-radius: 2px;
    background: linear-gradient(#eef3fb, #d3dff0);
  }
  .newtab:hover {
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  .page {
    position: relative;
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    background: var(--xp-window);
    border-top: 1px solid #8ea4c4;
  }
  .agentbar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    box-sizing: border-box;
    padding: 3px 8px;
    background: linear-gradient(#fff6c7, #ffe58a);
    border-bottom: 1px solid #c9a227;
    color: #4a3a00;
  }
  /* The sentence wraps to a second line (never cut with "..."): it says what the agent may do next (UX-172). */
  .agentbar span {
    flex: 1;
    min-width: 0;
    line-height: 1.25;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .bar-button {
    flex: none;
    pointer-events: auto;
    height: 22px;
    padding: 0 8px;
    border: 1px solid #a98a1b;
    border-radius: 2px;
    background: linear-gradient(#fffdf0, #f6df8a);
    font: inherit;
  }
  /* Take over stays at the right end with one width, whatever its label says. */
  .takeover {
    width: 86px;
    padding: 0;
  }
  .bar-button:disabled {
    opacity: 0.7;
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
