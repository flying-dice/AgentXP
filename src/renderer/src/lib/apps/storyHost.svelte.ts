/**
 * A DesktopHost for stories and tests: the fake backend (`createFakeApi`) plus an in-memory desktop
 * (`createFakeDesktop`). Reading `state` is reactive, and `updateView` is applied at once, so the
 * two-way flow (app reports, agent changes the view) can be played in Storybook.
 */
import type { Message } from '@ag-ui/core'
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { AppKind, AskChatRequest, AppView, AppWindowState, DesktopState, OpenWindowInput } from '@shared/desktop'
import type { AguiSessionState } from '@shared/agui-state'
import { createFakeApi, fakeAgui, type FakeApi } from '../app/fakeApi'
import { createFakeDesktop } from '../app/fakeDesktop'
import type { DriveDto } from '@shared/vfs'
import { chooseFolder } from './shared/chooseFolder'
import { addRemoved, type RemovedProject } from '../desktop/projectDrives'
import type { DesktopHost } from './types'
import { projectRootOf } from './explorer/explorerModel'
import type { VPath } from '@shared/vfs'

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

  chooseReview(path?: string | null): void {
    void this.api.desktop.openReview(this.current.desktopId, this.projectRootOf(path))
  }

  projectRootOf(path?: string | null): VPath {
    return projectRootOf(this.current.drives, this.current.home, path)
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

  /** Projects ejected through this host, newest first (the real desktop keeps the same list). */
  recentlyRemoved = $state.raw<RemovedProject[]>([])
  ejectDrive = async (letter: string): Promise<void> => {
    const drive = this.current.drives.find((d) => d.letter === letter)
    await this.api.drives.eject(this.current.desktopId, letter)
    if (drive?.folderId != null) this.recentlyRemoved = addRemoved(this.recentlyRemoved, { folderId: drive.folderId, label: drive.label })
  }
  plugInProject = async (): Promise<DriveDto | null> => {
    const folder = await chooseFolder(this.api, 'plug-in')
    return folder ? this.api.drives.plugIn(this.current.desktopId, folder.id) : null
  }
  plugInAgain = async (folderId: number): Promise<DriveDto | null> => {
    this.recentlyRemoved = this.recentlyRemoved.filter((r) => r.folderId !== folderId)
    return this.api.drives.plugIn(this.current.desktopId, folderId)
  }

  sendFileToChat = async (_windowId: number, _filePath: string, _text: string): Promise<void> => {}
  hasResumeNote = (_sessionId: number): boolean => false
  continueChat = async (_sessionId: number): Promise<void> => {}
  startChat = async (cwd: string): Promise<void> => void (await this.api.desktop.newChat(this.current.desktopId, undefined, cwd))

  /** Records the request (stories show it) and starts a chat like the real desktop, without a prompt. */
  askRequests = $state.raw<AskChatRequest[]>([])
  askChat = async (request: AskChatRequest): Promise<void> => {
    this.askRequests = [...this.askRequests.slice(-9), request]
    await this.api.desktop.newChat(this.current.desktopId)
  }

  /** Contexts the apps registered (stories show them), and which panes are open. */
  contexts = $state.raw<Record<number, () => Record<string, unknown> | null | undefined>>({})
  panes = $state.raw<Record<number, boolean>>({})
  setContext = (windowId: Id, provider: (() => Record<string, unknown> | null | undefined) | null): void => {
    const next = { ...this.contexts }
    if (provider) next[windowId] = provider
    else delete next[windowId]
    this.contexts = next
  }
  toggleChatPane = (windowId: Id): void => void (this.panes = { ...this.panes, [windowId]: !this.panes[windowId] })
  chatPaneOpen = (windowId: Id): boolean => this.panes[windowId] === true

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
