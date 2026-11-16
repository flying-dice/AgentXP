<script lang="ts">
  import { onMount } from 'svelte'
  import type { Agent7Api } from '@shared/ipc'
  import type { AppKind } from '@shared/desktop'
  import type { IconName } from './../kit/atoms/icons'
  import ActionCenter from '../kit/organisms/ActionCenter.svelte'
  import StartMenu from '../kit/organisms/StartMenu.svelte'
  import type { StartGroup, StartItem } from '../kit/organisms/StartMenu'
  import { startAppRequests } from '../apps/appRequests'
  import Desktop from '../kit/templates/Desktop.svelte'
  import { appRegistry } from '../desktop/apps'
  import { approvalReason } from '../desktop/approval'
  import { setDesktopContext } from '../desktop/context'
  import { DesktopController } from '../desktop/DesktopController.svelte'
  import DesktopSurface, { type DesktopIconDef } from '../desktop/DesktopSurface.svelte'
  import Gadgets from '../desktop/Gadgets.svelte'
  import SnipOverlay from '../desktop/SnipOverlay.svelte'
  import StickyNotesLayer from '../desktop/StickyNotesLayer.svelte'
  import TopBar from '../desktop/TopBar.svelte'
  import TrayFlag from '../desktop/TrayFlag.svelte'
  import UacDialog from '../desktop/UacDialog.svelte'
  import WelcomeDialog from '../desktop/WelcomeDialog.svelte'
  import WindowLayer from '../desktop/WindowLayer.svelte'
  import { taskbarItems } from '../desktop/windowOrder'

  interface Props {
    /** The backend; defaults to `window.agent7`. */
    api?: Agent7Api
    /** A prepared controller (stories); by default one is created for `api`. */
    controller?: DesktopController
  }

  let { api = window.agent7, controller }: Props = $props()

  // svelte-ignore state_referenced_locally
  const desktop = controller ?? new DesktopController(api)
  // svelte-ignore state_referenced_locally
  setDesktopContext({ desktop, inbox: desktop.inbox })

  let root: HTMLDivElement | undefined = $state()
  let orb: HTMLElement | null = $state(null)
  let flag: HTMLButtonElement | null = $state(null)
  let query = $state('')
  const since = new Date()

  onMount(() => {
    void desktop.start()
    const stopRequests = startAppRequests(desktop.api)
    orb = root?.querySelector<HTMLElement>('.w7-taskbar .orb') ?? null
    return () => {
      stopRequests()
      desktop.dispose()
    }
  })

  const icons = $derived(
    Object.fromEntries((Object.keys(appRegistry) as AppKind[]).map((k) => [k, appRegistry[k].icon])) as Record<AppKind, IconName>
  )
  const items = $derived(taskbarItems(desktop.state.windows, desktop.state.focusedWindowId, icons))

  const desktopIcons = $derived<DesktopIconDef[]>([
    { id: 'workspace', label: 'Workspace (W:)', icon: 'folder-open' },
    { id: 'chats', label: 'Chats', icon: 'session' },
    { id: 'code', label: 'Code', icon: 'file-code' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'browser', label: 'Browser', icon: 'globe' },
    { id: 'control-centre', label: 'Control Centre', icon: 'options' },
    { id: 'recycle', label: 'Recycle Bin', icon: desktop.recycleCount > 0 ? 'recycle-full' : 'recycle' }
  ])

  const START_APPS: AppKind[] = ['chat', 'explorer', 'code', 'terminal', 'browser']
  const groupOf = (id: string, title: string, kinds: AppKind[]): StartGroup => ({
    id,
    title,
    items: kinds.map((k) => ({ id: k, title: appRegistry[k].title, description: appRegistry[k].description, icon: appRegistry[k].icon }))
  })
  const groups: StartGroup[] = [
    groupOf('accessories', 'Accessories', ['notepad', 'wordpad', 'paint', 'snipping-tool', 'sticky-notes']),
    groupOf('system-tools', 'System Tools', ['event-viewer', 'agent-manager', 'control-centre'])
  ]
  const programs = $derived<StartItem[]>(
    START_APPS.map((k) => ({ id: k, title: k === 'chat' ? 'New chat' : appRegistry[k].title, description: appRegistry[k].description, icon: appRegistry[k].icon }))
  )
  const recent = $derived<StartItem[]>(desktop.chats.slice(0, 8).map((s) => ({ id: String(s.id), title: s.title || 'New chat' })))
  const places: StartItem[] = [
    { id: 'workspace', title: 'Workspace' },
    { id: 'control-centre', title: 'Control Centre' },
    { id: 'agent-manager', title: 'Task Manager' },
    { id: 'recycle-bin', title: 'Recycle Bin' },
    { id: 'new-desktop', title: 'New desktop…' }
  ]

  function runApp(id: string): void {
    if (id === 'chat') void desktop.newChat()
    else void desktop.openApp({ app: id as AppKind })
  }

  function openIcon(id: string): void {
    switch (id) {
      case 'workspace':
        return void desktop.openApp({ app: 'explorer' })
      case 'chats': {
        const latest = desktop.chats[0]
        return void (latest ? desktop.openApp({ app: 'chat', sessionId: latest.id }) : desktop.newChat())
      }
      case 'recycle':
        return void desktop.openApp({ app: 'recycle-bin' })
      default:
        return void desktop.openApp({ app: id as AppKind })
    }
  }

  function openPlace(id: string): void {
    desktop.startOpen = false
    if (id === 'new-desktop') void desktop.createDesktop()
    else if (id === 'workspace') void desktop.openApp({ app: 'explorer' })
    else void desktop.openApp({ app: id as AppKind })
  }

  const approvals = $derived(desktop.inbox.pending)
  const reviewing = $derived(desktop.reviewing && approvals.some((a) => a.key === desktop.reviewing?.key) ? desktop.reviewing : null)
  const centreApprovals = $derived(approvals.map((a) => ({ key: a.key, title: a.title, detail: a.chatTitle })))
  const messages = $derived(desktop.messages.map((m) => ({ id: m.id, text: m.text })))

  function onKeydown(event: KeyboardEvent): void {
    if (event.altKey && event.key === 'F4') {
      event.preventDefault()
      const id = desktop.state.focusedWindowId
      if (id !== null) void desktop.closeWindow(id)
    } else if (event.ctrlKey && event.key === 'Escape') {
      event.preventDefault()
      desktop.toggleStart()
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="page" bind:this={root}>
  <Desktop
    taskbarItems={items}
    startOpen={desktop.startOpen}
    onstart={() => desktop.toggleStart()}
    onitemclick={(item) => void desktop.toggleFromTaskbar(Number(item.id))}
  >
    <DesktopSurface
      icons={desktopIcons}
      selected={desktop.selectedIcon}
      gadgets={desktop.gadgetsVisible}
      onselect={(id) => (desktop.selectedIcon = id)}
      onopen={openIcon}
      onnewchat={() => void desktop.newChat()}
      onopenworkspace={() => void desktop.openApp({ app: 'explorer' })}
      ontogglegadgets={() => (desktop.gadgetsVisible = !desktop.gadgetsVisible)}
      oncontrolcentre={() => void desktop.openApp({ app: 'control-centre' })}
      onbackground={() => desktop.closePopups()}
    />
    {#if desktop.gadgetsVisible && !desktop.needsDesktop}
      <Gadgets chatTitle={desktop.context.title} contextUsed={desktop.context.used} contextSize={desktop.context.size} feed={desktop.feed} {since} />
    {/if}
    <StickyNotesLayer {desktop} />
    <WindowLayer {desktop} />
    {#if !desktop.needsDesktop}
      <TopBar
        title={desktop.state.title || desktop.state.folder.name}
        working={desktop.working}
        paused={desktop.state.paused}
        userInControl={desktop.state.userInControl}
        tools={desktop.state.tools}
        onpause={() => void desktop.togglePaused()}
        ontakecontrol={() => void desktop.toggleUserInControl()}
      />
    {/if}

    {#if desktop.snipOverlay}
      <SnipOverlay
        mode={desktop.snipOverlay.mode}
        windows={desktop.state.windows.filter((w) => w.windowState !== 'minimized').map((w) => ({ id: w.id, bounds: desktop.boundsOf(w) }))}
        onpick={(region) => desktop.snipOverlay?.resolve(region)}
        oncancel={() => desktop.snipOverlay?.resolve(null)}
      />
    {/if}

    {#if desktop.startOpen}
      <div class="start">
        <StartMenu
          {programs}
          {groups}
          {recent}
          {places}
          bind:query
          ignore={orb}
          powerLabel={desktop.state.paused ? 'Resume agent' : 'Pause agent'}
          onrun={runApp}
          onrecent={(id) => void desktop.openApp({ app: 'chat', sessionId: Number(id) })}
          onplace={openPlace}
          onpower={() => {
            desktop.startOpen = false
            void desktop.togglePaused()
          }}
          onclose={() => (desktop.startOpen = false)}
        />
      </div>
    {/if}
    {#if desktop.actionCenterOpen}
      <div class="center">
        <ActionCenter
          approvals={centreApprovals}
          {messages}
          ignore={flag}
          onreview={(key) => {
            const a = approvals.find((x) => x.key === key)
            if (a) void desktop.review(a)
          }}
          onopencontrolcentre={() => {
            desktop.actionCenterOpen = false
            void desktop.openApp({ app: 'control-centre' })
          }}
          onclose={() => (desktop.actionCenterOpen = false)}
        />
      </div>
    {/if}
    {#if reviewing}
      <UacDialog
        approval={reviewing}
        reason={approvalReason(reviewing.toolKind, desktop.policy, desktop.state.userInControl)}
        onanswer={(optionId) => void desktop.answerReview(optionId)}
        onclose={() => (desktop.reviewing = null)}
      />
    {/if}
    {#if desktop.needsDesktop}
      <WelcomeDialog onopen={() => void desktop.createDesktop()} />
    {/if}
    {#snippet tray()}
      <TrayFlag count={approvals.length} open={desktop.actionCenterOpen} bind:element={flag} onclick={() => desktop.toggleActionCenter()} />
    {/snippet}
  </Desktop>
</div>

<style>
  .page {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .start {
    position: absolute;
    left: 0;
    bottom: 0;
    z-index: 100001;
  }
  .center {
    position: absolute;
    right: 6px;
    bottom: 4px;
    z-index: 100001;
  }
</style>
