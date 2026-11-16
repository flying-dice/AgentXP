import type { InvokeApi } from '../../shared/ipc-channels'
import type { FilePicker } from '../application/ports'
import type { DesktopService } from '../application/desktop/DesktopService'
import type { ProcessService } from '../application/ProcessService'
import type { A2uiService } from '../application/A2uiService'
import type { AgentService } from '../application/AgentService'
import type { ChangeReverter } from '../application/ChangeReverter'
import type { FolderService } from '../application/FolderService'
import type { PermissionBroker } from '../application/PermissionBroker'
import type { SessionQueryService } from '../application/SessionQueryService'
import type { SessionService } from '../application/SessionService'
import type { ShellService } from '../application/ShellService'
import type { TranscriptExporter } from '../application/TranscriptExporter'

export interface ApiServices {
  agents: AgentService
  folders: FolderService
  sessions: SessionService
  queries: SessionQueryService
  broker: PermissionBroker
  reverter: ChangeReverter
  exporter: TranscriptExporter
  a2ui: A2uiService
  shell: ShellService
  desktops: DesktopService
  processes: ProcessService
  files: FilePicker
  appVersion: string
}

/** Calls that depend on the calling window are answered per window (see `registerDesktopHandlers`). */
const perWindow = (channel: string) => (): Promise<never> => Promise.reject(new Error(`${channel} is answered per window`))

/** Adapts the application services to the renderer-facing `Agent7Api` (minus `on`). */
export function createApi(s: ApiServices): InvokeApi {
  return {
    agents: {
      list: async () => s.agents.list(),
      create: async (input) => s.agents.create(input),
      update: async (id, input) => s.agents.update(id, input),
      remove: async (id) => s.agents.remove(id),
      setDefault: async (id) => s.agents.setDefault(id)
    },
    folders: {
      list: async () => s.folders.list(),
      pick: () => s.folders.pick(),
      add: async (path) => s.folders.add(path),
      remove: async (id) => s.folders.remove(id),
      readDir: (folderId, relativePath) => s.folders.readDir(folderId, relativePath),
      readFile: (folderId, relativePath) => s.folders.readFile(folderId, relativePath),
      gitBranch: (folderId) => s.folders.gitBranch(folderId)
    },
    desktop: {
      list: async () => s.desktops.list(),
      current: perWindow('desktop.current'),
      create: (folderId) => s.desktops.create(folderId),
      open: async (id) => s.desktops.open(id),
      rename: async (id, title) => s.desktops.rename(id, title),
      remove: (id) => s.desktops.remove(id),
      openWindow: async (input) => s.desktops.openWindow(input),
      closeWindow: async (windowId) => s.desktops.closeWindow(windowId),
      focusWindow: async (windowId) => s.desktops.focusWindow(windowId),
      setBounds: async (windowId, bounds) => s.desktops.setBounds(windowId, bounds),
      setWindowState: async (windowId, state) => s.desktops.setWindowState(windowId, state),
      updateView: async (windowId, view) => s.desktops.updateView(windowId, view),
      setPaused: (desktopId, paused) => s.desktops.setPaused(desktopId, paused),
      setUserInControl: async (desktopId, on) => s.desktops.setUserInControl(desktopId, on),
      newChat: (desktopId, agentId) => s.desktops.newChat(desktopId, agentId),
      policy: async () => s.desktops.policy(),
      setPolicy: async (policy) => s.desktops.setPolicy(policy),
      attachBrowser: perWindow('desktop.attachBrowser')
    },
    processes: { list: async () => s.processes.list(), end: (agentId, desktopId) => s.processes.end(agentId, desktopId) },
    app: {
      version: async () => s.appVersion
    },
    sessions: {
      list: async (folderId) => s.queries.list(folderId),
      get: async (id) => s.queries.get(id),
      create: (folderId, agentId) => s.sessions.create(folderId, agentId, s.desktops.desktopForFolder(folderId).id),
      rename: async (id, title) => s.sessions.rename(id, title),
      remove: (id) => s.sessions.remove(id),
      transcript: async (id) => s.queries.transcript(id),
      tasks: async (id) => s.queries.tasksOf(id),
      changes: async (id) => s.queries.changesOf(id),
      terminals: async (id) => s.queries.terminalsOf(id),
      surfaces: async (id) => s.queries.surfacesOf(id),
      prompt: (input) => s.sessions.prompt(input),
      cancel: (id) => s.sessions.cancel(id),
      setMode: (id, modeId) => s.sessions.setMode(id, modeId),
      setModel: (id, modelId) => s.sessions.setModel(id, modelId),
      respondPermission: async (requestId, optionId) => s.broker.respond(requestId, optionId),
      revertChange: (changeId) => s.reverter.revert(changeId),
      clearTranscript: async (id) => s.sessions.clearTranscript(id),
      exportTranscript: (id) => s.exporter.export(id)
    },
    a2ui: { dispatch: (event) => s.a2ui.dispatch(event) },
    shell: { openPath: (path) => s.shell.openPath(path) },
    dialogs: { pickFiles: () => s.files.pickFiles() }
  }
}
