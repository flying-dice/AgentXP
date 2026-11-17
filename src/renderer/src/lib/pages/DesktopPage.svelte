<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import type { AgentXPApi } from '@shared/ipc'
  import type { AppKind } from '@shared/desktop'
  import type { IconName } from './../kit/atoms/icons'
  import ActionCenter from '../kit/organisms/ActionCenter.svelte'
  import { controlNote } from '../desktop/activity'
  import ContextMenuStrip from '../kit/organisms/ContextMenuStrip.svelte'
  import StartMenu from '../kit/organisms/StartMenu.svelte'
  import type { StartGroup, StartItem } from '../kit/organisms/StartMenu'
  import { joinVPath } from '@shared/vfs'
  import { startAppRequests } from '../apps/appRequests'
  import Desktop from '../kit/templates/Desktop.svelte'
  import { appRegistry } from '../desktop/apps'
  import { approvalLabel, approvalOrigin, approvalReason } from '../desktop/approval'
  import AutoPlayDialog from '../desktop/AutoPlayDialog.svelte'
  import Balloon from '../kit/molecules/Balloon.svelte'
  import UsbTray from '../desktop/UsbTray.svelte'
  import { setDesktopContext } from '../desktop/context'
  import { DesktopController } from '../desktop/DesktopController.svelte'
  import DesktopSurface, { type DesktopIconDef } from '../desktop/DesktopSurface.svelte'
  import InfoPanels from '../desktop/InfoPanels.svelte'
  import SnipOverlay from '../desktop/SnipOverlay.svelte'
  import StickyNotesLayer from '../desktop/StickyNotesLayer.svelte'
  import TopBar from '../desktop/TopBar.svelte'
  import TrayFlag from '../desktop/TrayFlag.svelte'
  import UacDialog from '../desktop/UacDialog.svelte'
  import NewChatDialog from '../desktop/NewChatDialog.svelte'
  import NewReviewDialog from '../desktop/NewReviewDialog.svelte'
  import WelcomeDialog from '../desktop/WelcomeDialog.svelte'
  import WindowLayer from '../desktop/WindowLayer.svelte'
  import { observeBar } from '../desktop/barHeight'
  import { desktopWindowTitle } from '../launcher/launcherModel'
  import { ctrlNStartsChat, isCtrlN } from '../desktop/shellKeys'
  import { cycleRegion, focusRegion, tabOutOfWindow } from '../desktop/shellRegions'
  import { taskbarItems } from '../desktop/windowOrder'
  import { taskbarMenuItems } from '../desktop/taskbarMenu'
  import { ContextMenu } from '../apps/shared/ContextMenu.svelte'
  import { helpTopicFor } from '../apps/help/helpFocus'
  import { HOME_TOPIC } from '../apps/help/helpModel'

  interface Props {
    /** The backend; defaults to `window.agentxp`. */
    api?: AgentXPApi
    /** A prepared controller (stories); by default one is created for `api`. */
    controller?: DesktopController
  }

  let { api = window.agentxp, controller }: Props = $props()

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
    void desktop.start().then(() => desktop.showProjectHint() || desktop.showIconHint())
    const stopRequests = startAppRequests(desktop.api)
    void desktop.api.window.getState().then((s) => (maximized = s.maximized)).catch(() => {})
    const stopWindow = desktop.api.window.onStateChanged((s) => (maximized = s.maximized))
    orb = root?.querySelector<HTMLElement>('.xp-taskbar .orb') ?? null
    return () => {
      stopRequests()
      stopWindow()
      desktop.dispose()
    }
  })

  const icons = $derived(
    Object.fromEntries((Object.keys(appRegistry) as AppKind[]).map((k) => [k, appRegistry[k].icon])) as Record<AppKind, IconName>
  )
  // An app that is opening has its taskbar button at once.
  const items = $derived([
    ...taskbarItems(desktop.state.windows, desktop.state.focusedWindowId, icons, new Set(desktop.inbox.pending.map((a) => a.sessionId))),
    ...desktop.opening.map((o) => ({ id: `opening-${o.key}`, title: `Opening ${o.title}...`, icon: o.icon, running: true, testid: 'taskbar-item-opening' }))
  ])

  const desktopIcons = $derived<DesktopIconDef[]>([
    { id: 'computer', label: 'Computer', icon: 'computer', title: 'Computer: see the drives and the project folders (plugged in)' },
    { id: 'chats', label: 'Chats', icon: 'session', title: 'Chats: see your chats and open one' },
    { id: 'code', label: 'Code', icon: 'file-code', title: 'Code: read the files of a project' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal', title: 'Terminal: run commands' },
    { id: 'browser', label: 'Browser', icon: 'globe', title: 'Browser: browse the web together with the agent' },
    { id: 'control-centre', label: 'Control Center', icon: 'options', title: 'Control Center: agents, permissions and settings' },
    { id: 'task-scheduler', label: 'Task Scheduler', icon: 'scheduler', title: 'Task Scheduler: run an agent at a time you choose' },
    { id: 'recycle', label: 'Recycle Bin', icon: desktop.recycleCount > 0 ? 'recycle-full' : 'recycle', title: 'Recycle Bin: bring back changes that the agent made' }
  ])

  const START_APPS: AppKind[] = ['chat', 'explorer', 'code', 'code-review', 'terminal', 'browser', 'event-viewer', 'teams']
  const groupOf = (id: string, title: string, kinds: AppKind[]): StartGroup => ({
    id,
    title,
    items: kinds.map((k) => ({ id: k, title: appRegistry[k].title, description: appRegistry[k].description, icon: appRegistry[k].icon }))
  })
  const groups: StartGroup[] = [
    groupOf('accessories', 'Accessories', ['notepad', 'wordpad', 'paint', 'diagrams', 'snipping-tool', 'sticky-notes', 'kanban']),
    groupOf('system-tools', 'System Tools', ['agent-manager', 'control-centre', 'task-scheduler'])
  ]
  const programs = $derived<StartItem[]>(
    START_APPS.map((k) => ({ id: k, title: k === 'chat' ? 'New chat' : appRegistry[k].title, description: appRegistry[k].description, icon: appRegistry[k].icon }))
  )
  const recent = $derived<StartItem[]>(desktop.chats.slice(0, 8).map((s) => ({ id: String(s.id), title: s.title || 'New chat' })))
  const places: StartItem[] = [
    { id: 'computer', title: 'Computer' },
    { id: 'eject', title: 'Eject a project...' },
    { id: 'documents', title: 'Documents' },
    { id: 'control-centre', title: 'Control Center' },
    { id: 'agent-manager', title: 'Task Manager' },
    { id: 'recycle-bin', title: 'Recycle Bin' },
    { id: 'help', title: 'Help and Support' },
    { id: 'chat-on', title: 'New chat on a drive…' },
    { id: 'desktops', title: 'AgentXP Desktops…' }
  ]

  function runApp(id: string): void {
    // Code Review asks what to review first (project and ref); every other app opens with feedback.
    if (id === 'code-review') return desktop.chooseReview()
    const item = programs.find((p) => p.id === id) ?? groups.flatMap((g) => g.items).find((i) => i.id === id)
    const open = (): Promise<unknown> => (id === 'chat' ? desktop.newChatFlow() : desktop.openApp({ app: id as AppKind }))
    void desktop.openWithFeedback(item?.title ?? id, item?.icon, open)
  }

  /** Enter or double click on a desktop icon: the busy cursor and a taskbar button at once; a failure shows a message. */
  function openIcon(id: string): void {
    const icon = desktopIcons.find((i) => i.id === id)
    const open = (): Promise<unknown> => {
      switch (id) {
        case 'computer':
          return desktop.openApp({ app: 'explorer', path: '' })
        case 'chats': {
          // With chats, the Chats icon shows the list of them (Task Manager), also when chat windows are open (UX-146).
          return desktop.chats.length > 0 ? desktop.openTaskManager('chats') : desktop.newChatFlow()
        }
        case 'recycle':
          return desktop.openApp({ app: 'recycle-bin' })
        default:
          return desktop.openApp({ app: id as AppKind })
      }
    }
    void desktop.openWithFeedback(icon?.label ?? id, icon?.icon, open)
  }

  function openPlace(id: string): void {
    desktop.startOpen = false
    if (id === 'desktops') void desktop.showLauncher()
    else if (id === 'chat-on') desktop.newChatDialogOpen = true
    else if (id === 'help') void desktop.openApp({ app: 'help', topic: HOME_TOPIC })
    else if (id === 'eject') desktop.openEjectList()
    else if (id === 'computer') void desktop.openApp({ app: 'explorer', path: '' })
    else if (id === 'documents') void desktop.openApp({ app: 'explorer', path: joinVPath(desktop.state.home, 'Documents') ?? desktop.state.home })
    else void desktop.openApp({ app: id as AppKind })
  }

  const balloonAction = $derived.by(() => {
    const action = desktop.balloon?.action
    return action ? { label: action.label, onclick: () => void desktop.runBalloonAction() } : undefined
  })

  const approvals = $derived(desktop.inbox.pending)
  const popup = $derived(desktop.popup)
  $effect(() => {
    if (popup && !desktop.policy && !desktop.state.policy) void desktop.loadPolicy()
  })
  const centreApprovals = $derived(
    approvals.map((a) => ({ key: a.key, title: approvalLabel(a), detail: approvalOrigin(a.chatTitle, desktop.sessions.byId(a.sessionId)?.createdAt, a.room) }))
  )
  const messages = $derived(desktop.centreMessages)
  const policy = $derived(desktop.state.policy ?? desktop.policy)

  // The taskbar button menu: Restore, Minimize, Close window.
  const taskbarMenu = new ContextMenu()
  function taskbarContext(item: { id: string }, at: { x: number; y: number }): void {
    const w = desktop.state.windows.find((x) => x.id === Number(item.id))
    if (!w) return
    taskbarMenu.showAt(at.x, at.y, taskbarMenuItems(w.windowState, { restore: () => void desktop.restore(w.id).then(() => desktop.focusWindow(w.id)), minimize: () => void desktop.minimize(w.id), close: () => void desktop.closeWindow(w.id) }))
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.altKey && event.key === 'F4') {
      event.preventDefault()
      const id = desktop.state.focusedWindowId
      if (id !== null) void desktop.closeWindow(id)
    } else if (isCtrlN(event) && ctrlNStartsChat(desktop.focusedWindow?.app)) {
      // Ctrl+N: a new chat on the default drive, from the desktop and from Code, Explorer and Chat (not from Notepad's own New).
      event.preventDefault()
      void desktop.startDefaultChat()
    } else if (event.ctrlKey && event.key === 'Escape') {
      event.preventDefault()
      desktop.toggleStart()
    } else if (event.key === 'F1') {
      event.preventDefault()
      const focused = desktop.state.windows.find((w) => w.id === desktop.state.focusedWindowId && w.windowState !== 'minimized')
      void desktop.openApp({ app: 'help', topic: helpTopicFor(focused?.app) })
    } else if (event.key === 'F6' && root) {
      // F6 and Shift+F6: desktop icons, the active window, the bar, the taskbar, the tray.
      event.preventDefault()
      cycleRegion(root, event.shiftKey ? -1 : 1)
    } else if (event.key === 'Tab' && event.altKey) {
      // Alt+Tab (where the system lets it through) and Ctrl+Alt+Tab: the next window.
      event.preventDefault()
      void desktop.cycleWindows(event.shiftKey ? -1 : 1)
    } else if (event.key === 'Tab' && root && tabOutOfWindow(root, event)) {
      event.preventDefault()
    }
  }

  /** Enter or Space on a taskbar button brings the window forward and moves focus into it (the composer of a chat). */
  async function activateTaskbarItem(item: { id: string }): Promise<void> {
    await desktop.activateFromTaskbar(Number(item.id))
    await tick()
    if (root) focusRegion(root, 'window')
  }

  // The Start menu search starts empty every time the menu opens (Ctrl+Esc included).
  $effect(() => {
    if (desktop.startOpen) untrack(() => (query = ''))
  })

  // The operating system window is named after the desktop, so it is not mistaken for the launcher or another desktop.
  $effect(() => {
    if (desktop.state.title) document.title = desktopWindowTitle(desktop.state.title)
  })
</script>

<!-- The browser's own context menu never shows on the desktop: every app and the desktop have their own. -->
<svelte:window onkeydown={onKeydown} onkeydowncapture={() => desktop.noteUserActivity()} onpointerdowncapture={() => desktop.noteUserActivity()} oncontextmenu={(e) => e.preventDefault()} />

<div class="page" class:busy={desktop.opening.length > 0} bind:this={root}>
  <Desktop
    taskbarItems={items}
    startOpen={desktop.startOpen}
    onstart={() => desktop.toggleStart()}
    onitemclick={(item, via) => void (via.keyboard ? activateTaskbarItem(item) : desktop.toggleFromTaskbar(Number(item.id)))}
    onitemcontext={taskbarContext}
  >
    <DesktopSurface
      icons={desktopIcons}
      selected={desktop.selectedIcon}
      infopanels={desktop.infopanelsVisible}
      onselect={(id) => (desktop.selectedIcon = id)}
      onopen={openIcon}
      onnewchat={() => void desktop.newChatFlow()}
      onopencomputer={() => void desktop.openApp({ app: 'explorer', path: '' })}
      ontoggleinfopanels={() => (desktop.infopanelsVisible = !desktop.infopanelsVisible)}
      oncontrolcentre={() => void desktop.openApp({ app: 'control-centre' })}
      onbackground={() => desktop.closePopups()}
    />
    {#if desktop.infopanelsVisible && !desktop.needsDesktop}
      <InfoPanels chatTitle={desktop.context.title} contextUsed={desktop.context.used} contextSize={desktop.context.size} feed={desktop.feed} onshowfeeditem={(item) => void desktop.showFeedItem(item)} controlNote={controlNote(desktop.state.userInControl, desktop.feed, desktop.stoppedStep)} {since} onopeneventviewer={() => void desktop.openEventViewer()} onopenpermissions={() => void desktop.openControlCentre('permissions')} {api} desktopId={desktop.state.desktopId} working={desktop.working} />
    {/if}
    <StickyNotesLayer {desktop} />
    <WindowLayer {desktop} />
    {#if !desktop.needsDesktop}
      <div class="region" data-region="bar" use:observeBar={(rect) => void desktop.setBarRect(rect)}>
      <TopBar
        title={desktop.state.title}
        working={desktop.working}
        waiting={desktop.waitingCount}
        waitingFor={desktop.waitingLinkText}
        onopenrequest={() => void desktop.openNextRequest()}
        onopenworking={() => { const id = desktop.workingChatId; if (id !== null) void desktop.openChatOf(id) }}
        agentProblem={desktop.agentProblem}
        paused={desktop.state.paused}
        userInControl={desktop.state.userInControl}
        notice={desktop.notice}
        {policy}
        onpause={() => void desktop.togglePaused()}
        ontakecontrol={() => void desktop.toggleUserInControl()}
        onopenpermissions={(row) => void desktop.openControlCentre('permissions', row)}
        {maximized}
        onminimize={() => void desktop.api.window.minimize()}
        onmaximize={() => void desktop.api.window.toggleMaximize()}
        ondisconnect={() => void desktop.disconnect()}
      />
      </div>
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
          onaction={(id, actionId) => void desktop.runMessageAction(id, actionId)}
          ignore={flag}
          onreview={(key) => {
            const a = approvals.find((x) => x.key === key)
            if (a) void desktop.review(a)
          }}
          onopencontrolcentre={() => {
            desktop.actionCenterOpen = false
            void desktop.openApp({ app: 'control-centre' })
          }}
          onopeneventviewer={() => {
            desktop.actionCenterOpen = false
            void desktop.openEventViewer()
          }}
          onclose={() => (desktop.actionCenterOpen = false)}
        />
      </div>
    {/if}
    {#if popup}
      {#key popup.key}
        <UacDialog
          approval={popup}
          reason={approvalReason(popup.toolKind, policy, desktop.state.userInControl, popup.group)}
          queueText={approvals.length > 1 ? `1 of ${approvals.length} waiting` : null}
          onanswer={(optionId) => void desktop.answerReview(optionId)}
          onclose={() => desktop.closePopup()}
        />
      {/key}
    {/if}
    {#if desktop.needsDesktop}
      <WelcomeDialog onopen={() => void desktop.showLauncher()} />
    {/if}
    {#if desktop.newChatDialogOpen}
      <NewChatDialog
        drives={desktop.state.drives}
        preselect={desktop.lastChatDrive}
        oncancel={() => (desktop.newChatDialogOpen = false)}
        onstart={(cwd) => {
          desktop.newChatDialogOpen = false
          void desktop.newChatIn(cwd)
        }}
      />
    {/if}
    {#if desktop.reviewDialog}
      <NewReviewDialog
        drives={desktop.state.drives}
        root={desktop.reviewDialog.root}
        oncancel={() => (desktop.reviewDialog = null)}
        onstart={(root, baseRef) => {
          desktop.reviewDialog = null
          void desktop.openWithFeedback('Code Review', 'changes', () => desktop.openReview(root, baseRef))
        }}
      />
    {/if}
    {#if desktop.autoPlay}
      <AutoPlayDialog drive={desktop.autoPlay} onchoose={(c) => void desktop.autoPlayChoose(c)} />
    {/if}
    <!-- The Action Center lists every notice: no balloon on top of it while it is open. -->
    {#if desktop.balloon && !desktop.actionCenterOpen}
      <div class="balloon">
        {#key desktop.balloon}
          <Balloon
            title={desktop.balloon.title}
            text={desktop.balloon.text}
            icon={desktop.balloon.icon}
            identity={desktop.balloon.identity}
            more={desktop.moreBalloons}
            live={!desktop.balloon.queued}
            action={balloonAction}
            onclose={() => desktop.dismissBalloon()}
            onhold={(held) => desktop.holdBalloon(held)}
          />
        {/key}
      </div>
    {/if}
    <!-- New notices are read out once when they arrive (the balloon of a notice is not a live region itself). -->
    <div class="announcer" data-testid="notice-announcer" aria-live="polite" aria-atomic="true">{desktop.announcement}</div>
    <ContextMenuStrip bind:open={taskbarMenu.open} x={taskbarMenu.x} y={taskbarMenu.y} items={taskbarMenu.items} label="Taskbar button" />
    {#snippet tray()}
      <UsbTray drives={desktop.state.drives} bind:open={desktop.usbMenuOpen} bind:element={usbIcon} oneject={(l) => void desktop.ejectDrive(l)} removed={desktop.recentlyRemoved} onplugagain={(id) => void desktop.plugInAgain(id, { autoPlay: true })} />
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
  /* The agent is opening an app: the "working in background" cursor everywhere. */
  .page.busy,
  .page.busy :global(*) {
    cursor: progress !important;
  }
  .region {
    display: contents;
  }
  .start {
    position: absolute;
    left: 0;
    bottom: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    z-index: 100001;
  }
  .balloon {
    position: absolute;
    right: 72px;
    bottom: 44px;
    z-index: 100002;
  }
  .announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .center {
    position: absolute;
    right: 6px;
    bottom: 4px;
    z-index: 100001;
  }
</style>
