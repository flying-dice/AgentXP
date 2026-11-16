<script lang="ts">
  import { onMount } from 'svelte'
  import type { Agent7Api } from '@shared/ipc'
  import type { AppKind } from '@shared/desktop'
  import type { IconName } from './../kit/atoms/icons'
  import ActionCenter from '../kit/organisms/ActionCenter.svelte'
  import StartMenu from '../kit/organisms/StartMenu.svelte'
  import type { StartGroup, StartItem } from '../kit/organisms/StartMenu'
  import { joinVPath } from '@shared/vfs'
  import { startAppRequests } from '../apps/appRequests'
  import Desktop from '../kit/templates/Desktop.svelte'
  import { appRegistry } from '../desktop/apps'
  import { approvalReason } from '../desktop/approval'
  import AutoPlayDialog from '../desktop/AutoPlayDialog.svelte'
  import Balloon from '../desktop/Balloon.svelte'
  import UsbTray from '../desktop/UsbTray.svelte'
  import { setDesktopContext } from '../desktop/context'
  import { DesktopController } from '../desktop/DesktopController.svelte'
  import DesktopSurface, { type DesktopIconDef } from '../desktop/DesktopSurface.svelte'
  import Gadgets from '../desktop/Gadgets.svelte'
  import SnipOverlay from '../desktop/SnipOverlay.svelte'
  import StickyNotesLayer from '../desktop/StickyNotesLayer.svelte'
  import TopBar from '../desktop/TopBar.svelte'
  import TrayFlag from '../desktop/TrayFlag.svelte'
  import UacDialog from '../desktop/UacDialog.svelte'
  import NewChatDialog from '../desktop/NewChatDialog.svelte'
  import WelcomeDialog from '../desktop/WelcomeDialog.svelte'
  import WindowLayer from '../desktop/WindowLayer.svelte'
  import { taskbarItems } from '../desktop/windowOrder'
  import { HOME_TOPIC, topicForApp } from '../apps/help/helpModel'

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
  let usbIcon: HTMLButtonElement | null = $state(null)
  let query = $state('')
  let maximized = $state(false)
  const since = new Date()

  onMount(() => {
    void desktop.start()
    const stopRequests = startAppRequests(desktop.api)
    void desktop.api.window.getState().then((s) => (maximized = s.maximized)).catch(() => {})
    const stopWindow = desktop.api.window.onStateChanged((s) => (maximized = s.maximized))
    orb = root?.querySelector<HTMLElement>('.w7-taskbar .orb') ?? null
    return () => {
      stopRequests()
      stopWindow()
      desktop.dispose()
    }
  })

  const icons = $derived(
    Object.fromEntries((Object.keys(appRegistry) as AppKind[]).map((k) => [k, appRegistry[k].icon])) as Record<AppKind, IconName>
  )
  const items = $derived(taskbarItems(desktop.state.windows, desktop.state.focusedWindowId, icons))

  const desktopIcons = $derived<DesktopIconDef[]>([
    { id: 'computer', label: 'Computer', icon: 'computer' },
    { id: 'chats', label: 'Chats', icon: 'session' },
    { id: 'code', label: 'Code', icon: 'file-code' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'browser', label: 'Browser', icon: 'globe' },
    { id: 'control-centre', label: 'Control Centre', icon: 'options' },
    { id: 'recycle', label: 'Recycle Bin', icon: desktop.recycleCount > 0 ? 'recycle-full' : 'recycle' }
  ])

  const START_APPS: AppKind[] = ['chat', 'explorer', 'code', 'code-review', 'terminal', 'browser']
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
    { id: 'computer', title: 'Computer' },
    { id: 'documents', title: 'Documents' },
    { id: 'control-centre', title: 'Control Centre' },
    { id: 'agent-manager', title: 'Task Manager' },
    { id: 'recycle-bin', title: 'Recycle Bin' },
    { id: 'help', title: 'Help and Support' },
    { id: 'chat-on', title: 'New chat on a drive…' },
    { id: 'desktops', title: 'Agent7 Desktops…' }
  ]

  function runApp(id: string): void {
    if (id === 'chat') void desktop.newChat()
    else if (id === 'code-review') void desktop.openReview()
    else void desktop.openApp({ app: id as AppKind })
  }

  function openIcon(id: string): void {
    switch (id) {
      case 'computer':
        return void desktop.openApp({ app: 'explorer', path: '' })
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
    if (id === 'desktops') void desktop.showLauncher()
    else if (id === 'chat-on') desktop.newChatDialogOpen = true
    else if (id === 'help') void desktop.openApp({ app: 'help', topic: HOME_TOPIC })
    else if (id === 'computer') void desktop.openApp({ app: 'explorer', path: '' })
    else if (id === 'documents') void desktop.openApp({ app: 'explorer', path: joinVPath(desktop.state.home, 'Documents') ?? desktop.state.home })
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
    } else if (event.key === 'F1') {
      event.preventDefault()
      const focused = desktop.state.windows.find((w) => w.id === desktop.state.focusedWindowId && w.windowState !== 'minimized')
      void desktop.openApp({ app: 'help', topic: topicForApp(focused?.app) })
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
      onopencomputer={() => void desktop.openApp({ app: 'explorer', path: '' })}
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
        title={desktop.state.title}
        working={desktop.working}
        paused={desktop.state.paused}
        userInControl={desktop.state.userInControl}
        tools={desktop.state.tools}
        onpause={() => void desktop.togglePaused()}
        ontakecontrol={() => void desktop.toggleUserInControl()}
        {maximized}
        onminimize={() => void desktop.api.window.minimize()}
        onmaximize={() => void desktop.api.window.toggleMaximize()}
        ondisconnect={() => void desktop.disconnect()}
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
          ondisconnect={() => void desktop.disconnect()}
          onswitch={() => void desktop.showLauncher()}
          ondelete={() => void desktop.deleteDesktop()}
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
      <WelcomeDialog onopen={() => void desktop.showLauncher()} />
    {/if}
    {#if desktop.newChatDialogOpen}
      <NewChatDialog
        drives={desktop.state.drives}
        oncancel={() => (desktop.newChatDialogOpen = false)}
        onstart={(cwd) => {
          desktop.newChatDialogOpen = false
          void desktop.newChatIn(cwd)
        }}
      />
    {/if}
    {#if desktop.autoPlay}
      <AutoPlayDialog drive={desktop.autoPlay} onchoose={(c) => void desktop.autoPlayChoose(c)} />
    {/if}
    {#if desktop.balloon}
      <div class="balloon">
        <Balloon title={desktop.balloon.title} text={desktop.balloon.text} icon={desktop.balloon.icon} onclose={() => desktop.dismissBalloon()} />
      </div>
    {/if}
    {#snippet tray()}
      <UsbTray drives={desktop.state.drives} bind:open={desktop.usbMenuOpen} bind:element={usbIcon} oneject={(l) => void desktop.ejectDrive(l)} />
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
  .balloon {
    position: absolute;
    right: 72px;
    bottom: 44px;
    z-index: 100002;
  }
  .center {
    position: absolute;
    right: 6px;
    bottom: 4px;
    z-index: 100001;
  }
</style>
