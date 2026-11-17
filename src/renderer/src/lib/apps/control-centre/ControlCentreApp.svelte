<script lang="ts">
  import { untrack } from 'svelte'
  import type { ControlCentrePage } from '@shared/desktop'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import type { IconName } from '../../kit/atoms/icons'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import AboutPage from './AboutPage.svelte'
  import AgentsPage from './AgentsPage.svelte'
  import AppearancePage from './AppearancePage.svelte'
  import PermissionsPage from './PermissionsPage.svelte'
  import SkillsPage from './SkillsPage.svelte'

  let { window: win, host }: AppProps<'control-centre'> = $props()

  const pages: { id: ControlCentrePage; title: string; heading: string; icon: IconName }[] = [
    { id: 'agents', title: 'Agents', heading: 'Agents', icon: 'agent' },
    { id: 'permissions', title: 'Permissions', heading: 'Permissions', icon: 'shield' },
    { id: 'skills', title: 'Skills and MCP', heading: 'Skills and MCP Servers', icon: 'library' },
    { id: 'appearance', title: 'Appearance', heading: 'Appearance and Personalization', icon: 'options' },
    { id: 'about', title: 'About AgentXP', heading: 'About AgentXP', icon: 'info' }
  ]

  // svelte-ignore state_referenced_locally
  let page = $state<ControlCentrePage>(win.view.page)
  // The page last seen in the window's view. A state that still carries the old page (the report of a click is
  // debounced) must not flip the page back; only a view that changes from outside (the agent, a top bar chip) does.
  // svelte-ignore state_referenced_locally
  let seenInView = win.view.page

  function choose(next: ControlCentrePage): void {
    page = next
    host.updateView(win.id, { app: 'control-centre', page })
  }

  // The agent or the shell opens another page.
  $effect(() => {
    const incoming = win.view.page
    if (incoming === seenInView) return
    seenInView = incoming
    untrack(() => (page = incoming))
  })

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'control-centre')
  const ctx = new ContextMenu()

  const pageItems = (prefix: string): MenuItemDef[] => pages.map((p) => ({ id: `${prefix}-page-${p.id}`, testid: `${prefix}-page-${p.id}`, label: p.title, icon: p.icon, radio: true, checked: p.id === page, action: () => choose(p.id) }))

  // The chat pane knows the page.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ page }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: closeItems('control-centre', () => void host.closeWindow(win.id)).slice(1) },
      { label: '&View', items: [...pageItems('control-centre-menu'), { separator: true }, help.paneItem(win.id)] },
      help.menu()
    ])
  )

  const current = $derived(pages.find((p) => p.id === page) ?? pages[0])
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cc" data-testid="control-centre-app" oncontextmenu={(e) => ctx.show(e, pageItems('control-centre-ctx'))} onkeydown={(e) => ctx.key(e, () => pageItems('control-centre-ctx'))}>
  <MenuStrip {menus} aria-label="Control Center menu" />
  <div class="row">
  <nav class="tasks" aria-label="Control Center">
    <div class="caption">Control Center Home</div>
    <ul>
      {#each pages as p (p.id)}
        <li>
          <button class="task" data-testid="control-centre-page-{p.id}" class:on={p.id === page} aria-current={p.id === page ? 'page' : undefined} onclick={() => choose(p.id)}>
            <Icon name={p.icon} />{p.title}
          </button>
        </li>
      {/each}
    </ul>
  </nav>
  <main class="content">
    <h1 data-testid="control-centre-heading">{current.heading}</h1>
    <div class="page">
      {#if page === 'agents'}
        <AgentsPage {host} />
      {:else if page === 'permissions'}
        <PermissionsPage {host} windowId={win.id} selectedRow={win.view.row ?? null} />
      {:else if page === 'skills'}
        <SkillsPage {host} />
      {:else if page === 'appearance'}
        <AppearancePage />
      {:else}
        <AboutPage {host} />
      {/if}
    </div>
  </main>
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Control Center" />
  <AppAbout {help} />
</div>

<style>
  .cc {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
    container: cc / inline-size;
  }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .tasks {
    flex: none;
    width: 176px;
    padding: 12px 8px;
    background: linear-gradient(#fff, #dfe9f7);
    border-right: 1px solid #b5c4dc;
  }
  .caption {
    margin: 0 0 8px 4px;
    color: #1e3287;
    font-size: 12px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .task {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 6px;
    border: 1px solid transparent;
    background: transparent;
    color: #1e3287;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .task:hover {
    color: #0066cc;
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
  }
  .task.on {
    border-color: var(--xp-select-border);
    background: var(--xp-select-face);
  }
  .content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 12px 18px 14px;
    background: linear-gradient(#fff 0, #fff 60%, #f1f6fd);
  }
  h1 {
    flex: none;
    margin: 0 0 12px;
    color: #1e3287;
    font-size: 17px;
    font-weight: 400;
  }
  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    /* A short window never cuts a page off: the page scrolls (UX-198). */
    overflow-y: auto;
  }
  /* A narrow window (the chat pane is open beside it): the pages go in a strip on top, so the page keeps the whole width (UX-198). */
  @container cc (max-width: 639px) {
    .row {
      flex-direction: column;
    }
    .tasks {
      width: auto;
      padding: 4px 8px;
      border-right: 0;
      border-bottom: 1px solid #b5c4dc;
    }
    .caption {
      display: none;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 4px;
    }
    .task {
      width: auto;
    }
    .content {
      padding: 8px 12px 10px;
    }
  }
</style>
