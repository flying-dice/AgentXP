<script lang="ts">
  import { onMount } from 'svelte'
  import type { Agent7Api } from '@shared/ipc'
  import type { AppKind } from '@shared/desktop'
  import type { IconName } from './../kit/atoms/icons'
  import ActionCenter from '../kit/organisms/ActionCenter.svelte'
  import StartMenu from '../kit/organisms/StartMenu.svelte'
  import type { StartItem } from '../kit/organisms/StartMenu'
  import Desktop from '../kit/templates/Desktop.svelte'
  import { appRegistry } from '../desktop/apps'
  import { approvalReason } from '../desktop/approval'
  import { setDesktopContext } from '../desktop/context'
  import { DesktopController } from '../desktop/DesktopController.svelte'
  import DesktopSurface, { type DesktopIconDef } from '../desktop/DesktopSurface.svelte'
  import Gadgets from '../desktop/Gadgets.svelte'
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
    orb = root?.querySelector<HTMLElement>('.w7-taskbar .orb') ?? null
    return () => desktop.dispose()
  })

  const icons = $derived(
    Object.fromEntries((Object.keys(appRegistry) as AppKind[]).map((k) => [k, appRegistry[k].icon])) as Record<AppKind, IconName>
  )
  const items = $derived(taskbarItems(desktop.state.windows, desktop.state.focusedWindowId, icons))

  const desktopIcons: DesktopIconDef[] = [
    { id: 'workspace', label: 'Workspace (W:)', icon: 'folder-open' },
    { id: 'chats', label: 'Chats', icon: 'session' },
    { id: 'code', label: 'Code', icon: 'file-code' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'browser', label: 'Browser', icon: 'globe' },
    { id: 'control-centre', label: 'Control Centre', icon: 'options' },
    { id: 'recycle', label: 'Recycle Bin', icon: 'delete' }
  ]

  const START_APPS: AppKind[] = ['chat', 'explorer', 'notepad', 'code', 'terminal', 'browser']
  const programs = $derived<StartItem[]>(
    START_APPS.map((k) => ({ id: k, title: k === 'chat' ? 'New chat' : appRegistry[k].title, description: appRegistry[k].description, icon: appRegistry[k].icon }))
  )
  const recent = $derived<StartItem[]>(desktop.chats.slice(0, 8).map((s) => ({ id: String(s.id), title: s.title || 'New chat' })))
  const places: StartItem[] = [
    { id: 'workspace', title: 'Workspace' },
    { id: 'control-centre', title: 'Control Centre' },
    { id: 'agent-manager', title: 'Agent Manager' },
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
        return void desktop.openApp({ app: 'code' })
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

    {#if desktop.startOpen}
      <div class="start">
        <StartMenu
          {programs}
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
