import { untrack } from 'svelte'
import type { Message } from '@ag-ui/core'
import type { Agent7Api } from '@shared/ipc'
import type { AgentDto, FileChangeDto, FolderDto, Id, SessionDto, TaskDto } from '@shared/models'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'
import { showMessageBox } from '../kit/organisms/messageBox'
import { AgentsStore } from '../stores/AgentsStore.svelte'
import { FoldersStore } from '../stores/FoldersStore.svelte'
import { SessionsStore } from '../stores/SessionsStore.svelte'
import { SessionStoreCache } from '../stores/SessionStoreCache'
import { UiStore } from '../stores/UiStore.svelte'
import { WindowStore } from '../stores/WindowStore.svelte'
import { absolutePath } from './changes/changeFormat'
import { HELP_URL } from './links'
import type { MenuState } from './menus'
import { isBusy } from './sessionStatus'
import type { CommandId } from './shortcuts'

export type AppDialog =
  | { kind: 'none' }
  | { kind: 'options'; tab: 'general' | 'agents'; addAgent: boolean }
  | { kind: 'about' }
  | { kind: 'shortcuts' }
  | { kind: 'rename'; session: SessionDto }

export interface FileView {
  path: string
  text: string | null
  error: string | null
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** The last assistant message with text, for "Copy Last Response". */
export function lastResponseText(messages: readonly Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()) return m.content
  }
  return null
}

/**
 * Application logic of the main window: which session is active, what the commands do and which
 * dialogs are open. The components only render its state and call its methods.
 */
export class AppController {
  readonly api: Agent7Api
  readonly agents: AgentsStore
  readonly folders: FoldersStore
  readonly sessions: SessionsStore
  readonly ui: UiStore
  readonly win: WindowStore
  readonly cache: SessionStoreCache

  /** The AG-UI store of the active session. */
  activeStore = $state.raw<SessionAgentStore | null>(null)
  /** Folder picked in the session tree (target of "New Session"). */
  selectedFolderId = $state<Id | null>(null)
  selectedChangeId = $state<Id | null>(null)
  branch = $state<string | null>(null)
  version = $state('')
  loaded = $state(false)
  dialog = $state.raw<AppDialog>({ kind: 'none' })
  fileView = $state.raw<FileView | null>(null)

  get session(): SessionDto | null {
    return this.sessions.byId(this.ui.activeSessionId)
  }
  get folder(): FolderDto | null {
    return this.folders.byId(this.session?.folderId)
  }
  get agent(): AgentDto | null {
    return this.agents.byId(this.session?.agentId)
  }
  get changes(): FileChangeDto[] {
    return this.activeStore?.state.changes ?? []
  }
  get tasks(): TaskDto[] {
    return this.activeStore?.state.tasks ?? []
  }
  get busy(): boolean {
    return isBusy(this.session?.status ?? null) || (this.activeStore?.running ?? false)
  }
  get canCompact(): boolean {
    return !!this.session?.commands.some((c) => c.name.replace(/^\//, '') === 'compact')
  }
  get canUndo(): boolean {
    return this.changes.length > 0 && !this.busy
  }
  get title(): string {
    return this.session ? `${this.session.title || 'New session'} - Agent7` : 'Agent7'
  }
  get menuState(): MenuState {
    const session = this.session
    return {
      hasSession: !!session,
      busy: this.busy,
      canUndo: this.canUndo,
      canCompact: this.canCompact,
      modes: session?.modes ?? [],
      currentModeId: session?.currentModeId ?? null,
      models: session?.models ?? [],
      currentModelId: session?.currentModelId ?? null
    }
  }

  private unsubscribers: (() => void)[] = []

  constructor(api: Agent7Api, ui: UiStore = new UiStore()) {
    this.api = api
    this.ui = ui
    this.agents = new AgentsStore(api.agents)
    this.folders = new FoldersStore(api)
    this.sessions = new SessionsStore(api.sessions)
    this.win = new WindowStore(api.window)
    this.cache = new SessionStoreCache((id) => new SessionAgentStore(id, api.agui))
  }

  /** Loads the data, follows the push events and restores the last active session. */
  async start(): Promise<void> {
    this.unsubscribers = [
      this.folders.start(),
      this.sessions.start(this.api, (id) => this.onSessionRemoved(id)),
      this.win.start(),
      this.api.on('status.message', ({ text }) => this.ui.setStatus(text))
    ]
    await this.guard(async () => {
      await Promise.all([this.agents.load(), this.folders.load(), this.sessions.load()])
      this.version = await this.api.app.version()
    })
    const remembered = this.sessions.byId(this.ui.activeSessionId)
    this.select(remembered?.id ?? this.sessions.items[0]?.id ?? null)
    this.loaded = true
  }

  dispose(): void {
    this.unsubscribers.forEach((off) => off())
    this.unsubscribers = []
    this.cache.disposeAll()
  }

  /** Runs an async action and shows failures in an error message box. */
  async guard(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      this.reportError(error)
    }
  }

  reportError(error: unknown): void {
    void showMessageBox({ text: messageOf(error), caption: 'Agent7', buttons: 'OK', icon: 'error' })
  }

  private confirm(text: string, icon: 'warning' | 'question' = 'warning'): Promise<boolean> {
    return showMessageBox({ text, caption: 'Agent7', buttons: 'YesNo', icon }).then((r) => r === 'yes')
  }

  // ---- selection --------------------------------------------------------------------------------

  select(id: Id | null): void {
    this.ui.activeSessionId = id
    this.selectedChangeId = null
    this.activeStore = id === null ? null : untrack(() => this.cache.open(id))
    const folderId = untrack(() => this.sessions.byId(id)?.folderId)
    if (folderId !== undefined) this.selectedFolderId = folderId
  }

  private onSessionRemoved(id: Id): void {
    this.cache.forget(id)
    if (this.ui.activeSessionId === id) this.select(this.sessions.items[0]?.id ?? null)
  }

  async refreshBranch(): Promise<void> {
    const folder = this.folder
    if (!folder) {
      this.branch = null
      return
    }
    try {
      const branch = await this.api.folders.gitBranch(folder.id)
      if (this.folder?.id === folder.id) this.branch = branch
    } catch {
      this.branch = null
    }
  }

  // ---- commands ---------------------------------------------------------------------------------

  run(command: CommandId): void {
    switch (command) {
      case 'session.new':
        return void this.newSession()
      case 'folder.open':
        return void this.openFolder()
      case 'transcript.save':
        return void this.saveTranscript()
      case 'app.exit':
        return this.win.close()
      case 'edit.undo':
        return void this.undoLast()
      case 'edit.copyLast':
        return void this.copyLastResponse()
      case 'edit.clearTranscript':
        return void this.clearTranscript()
      case 'view.sessions':
        return void (this.ui.leftTab = 'sessions')
      case 'view.files':
        return void (this.ui.leftTab = 'files')
      case 'view.changes':
        return void (this.ui.rightTab = 'changes')
      case 'view.tasks':
        return void (this.ui.rightTab = 'tasks')
      case 'view.properties':
        return void (this.ui.rightTab = 'properties')
      case 'session.stop':
        return void this.stop()
      case 'session.compact':
        return void this.compact()
      case 'tools.options':
        return this.showOptions()
      case 'help.help':
        return void window.open(HELP_URL)
      case 'help.shortcuts':
        return void (this.dialog = { kind: 'shortcuts' })
      case 'help.about':
        return void (this.dialog = { kind: 'about' })
    }
  }

  closeDialog(): void {
    this.dialog = { kind: 'none' }
  }

  showOptions(tab: 'general' | 'agents' = 'general', addAgent = false): void {
    this.dialog = { kind: 'options', tab, addAgent }
  }

  async openFolder(): Promise<FolderDto | null> {
    let picked: FolderDto | null = null
    await this.guard(async () => {
      picked = await this.folders.pick()
      if (picked) {
        this.selectedFolderId = picked.id
        this.ui.setStatus(`Opened ${picked.path}`)
      }
    })
    return picked
  }

  async newSession(folderId?: Id): Promise<void> {
    const folder =
      (folderId !== undefined ? this.folders.byId(folderId) : null) ??
      this.folder ??
      this.folders.byId(this.selectedFolderId) ??
      this.folders.items[0] ??
      null
    if (!folder) {
      const picked = await this.openFolder()
      if (picked) await this.newSession(picked.id)
      return
    }
    if (this.agents.items.length === 0) {
      await showMessageBox({ text: 'No agent is configured yet. Add an agent first.', caption: 'Agent7', buttons: 'OK', icon: 'information' })
      this.showOptions('agents', true)
      return
    }
    this.ui.setStatus(`Starting a session in ${folder.name}...`)
    await this.guard(async () => {
      const session = await this.sessions.create(folder.id)
      this.select(session.id)
      this.ui.leftTab = 'sessions'
      this.ui.setStatus('Ready')
    })
    if (this.ui.status.startsWith('Starting')) this.ui.setStatus('Ready')
  }

  async saveTranscript(): Promise<void> {
    const session = this.session
    if (!session) return
    await this.guard(async () => {
      const path = await this.api.sessions.exportTranscript(session.id)
      if (path) this.ui.setStatus(`Transcript saved to ${path}`)
    })
  }

  async undoLast(): Promise<void> {
    const change = this.changes.find((c) => c.id === this.selectedChangeId) ?? this.changes[this.changes.length - 1]
    if (change && this.canUndo) await this.revertChange(change)
  }

  async revertChange(change: FileChangeDto): Promise<void> {
    const store = this.activeStore
    if (!store) return
    if (!(await this.confirm(`Revert the changes to ${change.path}?\n\nThe file goes back to how it was before the agent edited it.`))) return
    await this.guard(async () => {
      await this.api.sessions.revertChange(change.id)
      await store.connect()
      this.selectedChangeId = null
      this.ui.setStatus(`Reverted ${change.path}`)
    })
  }

  async copyLastResponse(): Promise<void> {
    const text = this.activeStore ? lastResponseText(this.activeStore.messages) : null
    if (!text) return this.ui.setStatus('There is no response to copy yet')
    await this.guard(async () => {
      await navigator.clipboard.writeText(text)
      this.ui.setStatus('Last response copied to the clipboard')
    })
  }

  async clearTranscript(): Promise<void> {
    const session = this.session
    const store = this.activeStore
    if (!session || !store) return
    if (!(await this.confirm('Clear the whole transcript of this session?'))) return
    await this.guard(async () => {
      await this.api.sessions.clearTranscript(session.id)
      await store.connect()
      this.ui.setStatus('Transcript cleared')
    })
  }

  async stop(): Promise<void> {
    if (this.activeStore && this.busy) await this.activeStore.cancel()
  }

  async compact(): Promise<void> {
    if (this.activeStore && this.canCompact && !this.busy) await this.activeStore.send('/compact')
  }

  async setMode(modeId: string): Promise<void> {
    const session = this.session
    if (session) await this.guard(() => this.api.sessions.setMode(session.id, modeId))
  }

  async setModel(modelId: string): Promise<void> {
    const session = this.session
    if (session) await this.guard(() => this.api.sessions.setModel(session.id, modelId))
  }

  async renameSession(session: SessionDto, title: string): Promise<void> {
    await this.guard(() => this.sessions.rename(session.id, title))
  }

  async deleteSession(session: SessionDto): Promise<void> {
    if (!(await this.confirm(`Delete the session "${session.title || 'New session'}" and its transcript?`))) return
    await this.guard(() => this.sessions.remove(session.id))
    this.onSessionRemoved(session.id)
  }

  async removeFolder(folder: FolderDto): Promise<void> {
    const count = this.sessions.forFolder(folder.id).length
    const detail = count > 0 ? `\n\nIts ${count} session${count === 1 ? '' : 's'} will be deleted too. The files on disk stay untouched.` : '\n\nThe files on disk stay untouched.'
    if (!(await this.confirm(`Remove the folder "${folder.name}" from Agent7?${detail}`))) return
    const removed = this.sessions.forFolder(folder.id).map((s) => s.id)
    await this.guard(async () => {
      await this.folders.remove(folder.id)
      await this.sessions.load()
    })
    removed.filter((id) => !this.sessions.byId(id)).forEach((id) => this.onSessionRemoved(id))
    if (this.selectedFolderId === folder.id) this.selectedFolderId = null
  }

  openInEditor(change: FileChangeDto): void {
    const folder = this.folder
    if (folder) void this.guard(() => this.api.shell.openPath(absolutePath(folder.path, change.path)))
  }

  async openFile(path: string): Promise<void> {
    const folder = this.folder
    if (!folder) return
    this.fileView = { path, text: null, error: null }
    try {
      const text = await this.api.folders.readFile(folder.id, path)
      this.fileView = { path, text, error: null }
    } catch (error) {
      this.fileView = { path, text: '', error: messageOf(error) }
    }
  }

  closeFile(): void {
    this.fileView = null
  }
}
