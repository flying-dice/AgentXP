/** Story helpers: a fake backend with a few windows open, and a controller prepared for a screenshot. */
import type { DesktopState } from '@shared/desktop'
import type { AgentXPApi } from '@shared/ipc'
import { createFakeApi } from '../app/fakeApi'
import { FakeSessionStore } from '../app/session/FakeSessionStore.svelte'
import { permissionTurn, runningTurn } from '../app/session/session.fixtures'
import { handleAppRequest } from '../apps/appRequests'
import { houseScene } from '../apps/paint/paintDemo'
import { DesktopController } from './DesktopController.svelte'

const markAgentOpened = (state: DesktopState): DesktopState => ({ ...state, windows: state.windows.map((w) => (w.app === 'browser' ? { ...w, openedBy: 'agent' as const } : w)) })

export interface PreparedDesktop {
  api: AgentXPApi
  controller: DesktopController
}

export interface PrepareOptions {
  /** Open a typical set of windows (chat, explorer, terminal). */
  windows?: boolean
  maximizeChat?: boolean
  startOpen?: boolean
  actionCenter?: boolean
  /** A pending permission request from a second chat. */
  approval?: boolean
  /** Open the UAC dialog for that approval. */
  review?: boolean
  firstRun?: boolean
  paused?: boolean
  agentOpened?: boolean
  taskpanes?: boolean
  /** The Safely Remove menu of the USB tray icon is open. */
  usbMenu?: boolean
  /** The "Project removed" balloon is showing (as after an eject). */
  balloon?: boolean
  /** The AutoPlay dialog for a just-plugged-in drive F: (dotfiles). */
  autoPlay?: boolean
  /** Starts Safely Remove on E:, whose chats are working: the warning box shows. */
  eject?: boolean
  /** Extra apps to open (in a cascade) after the usual ones. */
  /** Show the snipping overlay. */
  snip?: 'rect' | 'window'
  /** The agent draws a scene in Agent Paint once the desktop is up. */
  draw?: boolean
  apps?: ('paint' | 'sticky-notes' | 'event-viewer' | 'wordpad' | 'recycle-bin' | 'snipping-tool')[]
}

export async function prepareDesktop(options: PrepareOptions = {}): Promise<PreparedDesktop> {
  const api = createFakeApi({ empty: options.firstRun })
  if (options.firstRun) api.desktop.current = async () => null
  if (options.agentOpened) {
    // The fake backend always says openedBy 'user'; the real one remembers who opened a window.
    const on = api.on.bind(api) as (event: string, listener: (payload: DesktopState) => void) => () => void
    api.on = ((event: string, listener: (payload: never) => void) =>
      event === 'desktop.changed' ? on(event, (s) => (listener as (s: DesktopState) => void)(markAgentOpened(s))) : on(event, listener as never)) as AgentXPApi['on']
  }
  const d = api.desktop
  const desktopId = 1
  if (!options.firstRun) {
    // createFakeApi opens an anonymous chat window; replace it with real ones.
    const initial = await d.current()
    for (const w of initial?.windows ?? []) await d.closeWindow(w.id)
    if (options.windows !== false) {
      const explorer = await d.openWindow({ desktopId, app: 'explorer', path: 'E:\\src\\auth' })
      await d.setBounds(explorer.id, { x: 36, y: 56, width: 560, height: 330 })
      const terminal = await d.openWindow({ desktopId, app: 'terminal' })
      await d.setBounds(terminal.id, { x: 250, y: 300, width: 560, height: 270 })
      const chat = await d.openWindow({ desktopId, app: 'chat', sessionId: 1 })
      await d.setBounds(chat.id, { x: 330, y: 70, width: 520, height: 380 })
      await d.updateView(chat.id, { app: 'chat', sessionId: 1, title: 'Fix login redirect bug' })
      if (options.maximizeChat) await d.setWindowState(chat.id, 'maximized')
      if (options.agentOpened) {
        const browser = await d.openWindow({ desktopId, app: 'browser', url: 'https://example.com' })
        await d.setBounds(browser.id, { x: 150, y: 140, width: 520, height: 300 })
      }
    }
    let at = 0
    for (const app of options.apps ?? []) {
      const w = await d.openWindow({ desktopId, app })
      if (app === 'paint') await d.setBounds(w.id, { x: 30, y: 40, width: 640, height: 420 })
      else if (app === 'event-viewer') await d.setBounds(w.id, { x: 110, y: 430, width: 820, height: 290 })
      else if (app === 'sticky-notes') await d.setBounds(w.id, { x: 880, y: 440, width: 340, height: 270 })
      at++
    }
    if (options.paused) await d.setPaused(desktopId, true)
  }
  const controller = new DesktopController(api)
  if (options.approval) {
    const turn = permissionTurn()
    controller.inbox.register(2, new FakeSessionStore({ ...turn, state: { ...turn.state, session: { ...turn.state.session, title: 'Add parser unit tests' } } }))
    controller.inbox.register(3, new FakeSessionStore({ ...runningTurn(), running: true }))
  }
  controller.startOpen = !!options.startOpen
  controller.actionCenterOpen = !!options.actionCenter
  controller.taskpanesVisible = options.taskpanes !== false
  controller.messages = options.actionCenter || options.review ? [
    { id: 1, text: 'Context is at 6%. The agent compacts automatically at 80%.', at: new Date() },
    { id: 2, text: 'Opened E:\\', at: new Date() }
  ] : []
  await controller.start()
  if (options.agentOpened && controller.current) controller.current = markAgentOpened(controller.current)
  if (options.snip) void controller.pickSnipRegion(options.snip)
  if (options.usbMenu) controller.usbMenuOpen = true
  if (options.balloon) controller.showBalloon({ title: 'Project removed', text: "'dotfiles' (F:) was removed from this desktop. Your files are still in the folder. Double-click it in Computer to plug it in again.", icon: 'usb-safe' })
  if (options.autoPlay) await api.drives.plugIn(1, 2)
  if (options.eject) void controller.ejectDrive('E')
  if (options.draw) {
    const paint = controller.state.windows.find((w) => w.app === 'paint')
    if (paint) setTimeout(() => void handleAppRequest({ requestId: 'story-draw', desktopId: 1, windowId: paint.id, method: 'draw', params: { ops: houseScene } }), 500)
  }
  if (options.review) {
    const first = controller.inbox.pending[0]
    if (first) await controller.review(first)
  }
  return { api, controller }
}
