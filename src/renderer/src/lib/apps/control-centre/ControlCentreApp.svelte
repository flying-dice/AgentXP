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
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { ViewSync } from '../viewSync'
  import AboutPage from './AboutPage.svelte'
  import AgentsPage from './AgentsPage.svelte'
  import AppearancePage from './AppearancePage.svelte'
  import PermissionsPage from './PermissionsPage.svelte'

  let { window: win, host }: AppProps<'control-centre'> = $props()

  const pages: { id: ControlCentrePage; title: string; heading: string; icon: IconName }[] = [
    { id: 'agents', title: 'Agents', heading: 'Agents', icon: 'agent' },
    { id: 'permissions', title: 'Permissions', heading: 'Permissions', icon: 'shield' },
    { id: 'appearance', title: 'Appearance', heading: 'Appearance and Personalization', icon: 'options' },
    { id: 'about', title: 'About Agent7', heading: 'About Agent7', icon: 'info' }
  ]

  // svelte-ignore state_referenced_locally
  let page = $state<ControlCentrePage>(win.view.page)
  const sync = new ViewSync<{ page: ControlCentrePage }>((v) => v.page)
  // svelte-ignore state_referenced_locally
  sync.isExternal({ page })

  function choose(next: ControlCentrePage): void {
    page = next
    if (sync.mark({ page })) host.updateView(win.id, { app: 'control-centre', page })
  }

  // The agent or the shell opens another page.
  $effect(() => {
    const incoming = win.view.page
    if (sync.isExternal({ page: incoming })) untrack(() => (page = incoming))
  })

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'control-centre')
  const ctx = new ContextMenu()

  const pageItems = (prefix: string): MenuItemDef[] => pages.map((p) => ({ id: `${prefix}-page-${p.id}`, testid: `${prefix}-page-${p.id}`, label: p.title, icon: p.icon, radio: true, checked: p.id === page, action: () => choose(p.id) }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: closeItems('control-centre', () => void host.closeWindow(win.id)).slice(1) },
      { label: '&View', items: pageItems('control-centre-menu') },
      help.menu()
    ])
  )

  const current = $derived(pages.find((p) => p.id === page) ?? pages[0])
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cc" data-testid="control-centre-app" oncontextmenu={(e) => ctx.show(e, pageItems('control-centre-ctx'))} onkeydown={(e) => ctx.key(e, () => pageItems('control-centre-ctx'))}>
  <MenuStrip {menus} aria-label="Control Centre menu" />
  <div class="row">
  <nav class="tasks" aria-label="Control Centre">
    <div class="caption">Control Centre Home</div>
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
        <PermissionsPage {host} />
      {:else if page === 'appearance'}
        <AppearancePage />
      {:else}
        <AboutPage {host} />
      {/if}
    </div>
  </main>
  </div>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Control Centre" />
  <AppAbout {help} />
</div>

<style>
  .cc {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
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
    background: linear-gradient(#fdfeff, #dfe9f7);
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
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .task.on {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
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
  }
</style>
