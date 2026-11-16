/**
 * A DesktopHost for stories and tests: the fake backend (`createFakeApi`) plus an in-memory desktop
 * (`createFakeDesktop`). Reading `state` is reactive, and `updateView` is applied at once, so the
 * two-way flow (app reports, agent changes the view) can be played in Storybook.
 */
import type { Message } from '@ag-ui/core'
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { AppKind, AppView, AppWindowState, DesktopState, OpenWindowInput } from '@shared/desktop'
import type { AguiSessionState } from '@shared/agui-state'
import { createFakeApi, fakeAgui, type FakeApi } from '../app/fakeApi'
import { createFakeDesktop } from '../app/fakeDesktop'
import type { DesktopHost } from './types'

export class StoryHost implements DesktopHost {
  readonly api: Agent7Api
  /** The fake backend (for stories that push events). */
  readonly fake: FakeApi
  private current = $state.raw<DesktopState>(null as unknown as DesktopState)
  /** Every `updateView` the apps made, newest last (for stories that show the traffic). */
  reports = $state.raw<AppView[]>([])

  constructor(options: { empty?: boolean; state?: () => AguiSessionState; messages?: () => Message[] } = {}) {
    const base = createFakeApi({ empty: options.empty })
    this.fake = base
    const desktop = createFakeDesktop({ drives: base.driveList(), onChange: (state) => void (this.current = state) })
    base.watchDrives((drives) => desktop.setDrives(drives))
    this.current = desktop.state()
    this.api = { ...base, desktop, ...(options.state || options.messages ? { agui: fakeAgui(options.state, options.messages) } : {}) }
  }

  get state(): DesktopState {
    return this.current
  }

  /** Opens a window synchronously (the fake backend is) and optionally replaces its initial view. */
  open(input: Omit<OpenWindowInput, 'desktopId'>, view?: AppView): AppWindowState {
    void this.api.desktop.openWindow({ desktopId: this.current.desktopId, ...input })
    const created = this.current.windows.at(-1)!
    if (view) void this.api.desktop.updateView(created.id, view)
    return this.byId(created.id)
  }

  byId(id: Id): AppWindowState {
    return this.current.windows.find((w) => w.id === id)!
  }

  openApp = async (input: Omit<OpenWindowInput, 'desktopId'>): Promise<AppWindowState> => this.api.desktop.openWindow({ desktopId: this.current.desktopId, ...input })
  closeWindow = (windowId: Id): Promise<void> => this.api.desktop.closeWindow(windowId)
  focusWindow = (windowId: Id): Promise<void> => this.api.desktop.focusWindow(windowId)

  ejectDrive = (letter: string): Promise<void> => this.api.drives.eject(this.current.desktopId, letter)

  startChat = async (cwd: string): Promise<void> => void (await this.api.desktop.newChat(this.current.desktopId, undefined, cwd))

  updateView(windowId: Id, view: AppView): void {
    this.reports = [...this.reports.slice(-9), view]
    void this.api.desktop.updateView(windowId, view)
  }

  /** What the agent does: changes a window's view from outside the app. */
  agentSetsView(windowId: Id, view: AppView): void {
    void this.api.desktop.updateView(windowId, view)
  }
}

export const sampleChatView = (sessionId = 1, title = 'Fix login redirect bug'): Extract<AppView, { app: 'chat' }> => ({ app: 'chat', sessionId, title })

/** Default views for stories, by app. */
export const storyViews: { [K in AppKind]?: Extract<AppView, { app: K }> } = {
  chat: sampleChatView(),
  explorer: { app: 'explorer', path: 'E:\\src\\auth', selected: [] },
  notepad: { app: 'notepad', path: 'E:\\README.md', dirty: false, caretLine: 1 },
  code: { app: 'code', tabs: ['E:\\src\\auth\\redirect.ts', 'E:\\src\\index.ts'], activePath: 'E:\\src\\auth\\redirect.ts', visibleLines: null, selection: null, selectedChangeId: null },
  browser: { app: 'browser', url: 'https://example.com/', title: 'Example Domain', loading: false }
}
