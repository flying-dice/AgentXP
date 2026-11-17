import type { InvokeApi } from '../../shared/ipc-channels'
import type { VPath } from '../../shared/vfs'
import { parseImageDataUrl } from '../application/tools/dataUrl'
import type { DirectoryBrowser, FilePicker, ScreenCapturer } from '../application/ports'
import type { AppRequestBroker } from '../application/desktop/AppRequestBroker'
import type { ProtocolEventLog } from '../application/events/ProtocolEventLog'
import type { VirtualFileSystem } from '../application/vfs/VirtualFileSystem'
import type { GitService } from '../application/git/GitService'
import type { ReviewService } from '../application/review/ReviewService'
import type { DriveService } from '../application/vfs/DriveService'
import type { LauncherService } from '../application/launcher/LauncherService'
import type { RecycleService } from '../application/RecycleService'
import type { StickyNoteService } from '../application/desktop/StickyNoteService'
import type { KanbanService } from '../application/kanban/KanbanService'
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
import type { McpServerService } from '../application/teams/McpServerService'
import type { SkillService } from '../application/teams/SkillService'
import type { TeamRoomService } from '../application/teams/TeamRoomService'
import type { TeamService } from '../application/teams/TeamService'

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
  vfs: VirtualFileSystem
  git: GitService
  reviews: ReviewService
  drives: DriveService
  launcher: LauncherService
  processes: ProcessService
  files: FilePicker
  directories: DirectoryBrowser
  nativePicker: boolean
  appRequests: AppRequestBroker
  notes: StickyNoteService
  kanban: KanbanService
  eventLog: ProtocolEventLog
  recycle: RecycleService
  screen: ScreenCapturer
  skills: SkillService
  mcp: McpServerService
  teamService: TeamService
  rooms: TeamRoomService
  appVersion: string
}

/** Calls that depend on the calling window are answered per window (see `registerDesktopHandlers`). */
const perWindow = (channel: string) => (): Promise<never> => Promise.reject(new Error(`${channel} is answered per window`))

/** Adapts the application services to the renderer-facing `AgentXPApi` (minus `on`). */
export function createApi(s: ApiServices): InvokeApi {
  return {
    agents: {
      list: async () => s.agents.list(),
      create: async (input) => s.agents.create(input),
      update: async (id, input) => s.agents.update(id, input),
      remove: async (id) => s.agents.remove(id),
      setDefault: async (id) => s.agents.setDefault(id),
      check: async (command) => s.agents.check(command)
    },
    folders: {
      list: async () => s.folders.list(),
      pick: () => s.folders.pick(),
      add: async (path) => s.folders.add(path),
      remove: async (id) => s.folders.remove(id),
      readDir: (folderId, relativePath) => s.folders.readDir(folderId, relativePath),
      readFile: (folderId, relativePath) => s.folders.readFile(folderId, relativePath),
      gitBranch: (folderId) => s.folders.gitBranch(folderId),
      writeFile: (folderId, relativePath, text) => s.folders.writeFile(folderId, relativePath, text)
    },
    desktop: {
      current: perWindow('desktop.current'),
      rename: async (id, title) => s.launcher.rename(id, title),
      openWindow: async (input) => s.desktops.openWindow(input),
      closeWindow: async (windowId) => s.desktops.closeWindow(windowId),
      focusWindow: async (windowId) => s.desktops.focusWindow(windowId),
      setBounds: async (windowId, bounds) => s.desktops.setBounds(windowId, bounds),
      setWindowState: async (windowId, state) => s.desktops.setWindowState(windowId, state),
      updateView: async (windowId, view) => s.desktops.updateView(windowId, view),
      setPaused: (desktopId, paused) => s.desktops.setPaused(desktopId, paused),
      resumeAgents: (desktopId) => s.desktops.resumeAgents(desktopId),
      setUserInControl: async (desktopId, on) => s.desktops.setUserInControl(desktopId, on),
      newChat: async (desktopId, agentId, cwd) => {
        try {
          const opened = await s.desktops.newChat(desktopId, agentId, cwd)
          s.launcher.clearStartFailure(desktopId)
          return opened
        } catch (error) {
          s.launcher.recordStartFailure(desktopId, error instanceof Error ? error.message : String(error))
          throw error
        }
      },
      openReview: (desktopId, root, baseRef, agentId, selectedPath) => s.desktops.openReview(desktopId, root, baseRef, agentId, selectedPath),
      openAside: (desktopId, windowId, agentId) => s.desktops.openAside(desktopId, windowId, agentId),
      closeAside: (windowId) => s.desktops.closeAside(windowId),
      policy: async () => s.desktops.policy(),
      setPolicy: async (policy) => s.desktops.setPolicy(policy),
      attachBrowser: perWindow('desktop.attachBrowser'),
      respondAppRequest: async (response) => s.appRequests.respond(response),
      raiseWindow: async (windowId) => s.desktops.raiseWindow(windowId),
      userActive: async (desktopId) => s.desktops.noteUserActivity(desktopId)
    },
    vfs: {
      readDir: (desktopId, path) => s.vfs.readDir(desktopId, path),
      readFile: (desktopId, path) => s.vfs.readFile(desktopId, path),
      writeFile: async (desktopId, path, text) => {
        await s.vfs.writeFile(desktopId, path, text)
        s.git.touched(desktopId, path)
      },
      stat: (desktopId, path) => s.vfs.stat(desktopId, path)
    },
    git: {
      status: (desktopId, root) => s.git.status(desktopId, root),
      lineChanges: (desktopId, path) => s.git.lineChanges(desktopId, path),
      headText: (desktopId, path) => s.git.headText(desktopId, path),
      revertHunk: (desktopId, path, hunkIndex) => s.git.revertHunk(desktopId, path, hunkIndex),
      init: (desktopId, root) => s.git.init(desktopId, root)
    },
    review: {
      changes: (desktopId, root, baseRef) => s.reviews.changes(desktopId, root, baseRef),
      file: (desktopId, root, baseRef, path) => s.reviews.file(desktopId, root, baseRef, path),
      state: async (sessionId) => s.reviews.state(sessionId),
      addComment: async (sessionId, input) => s.reviews.addComment(sessionId, input, 'user'),
      setState: async (commentId, state) => s.reviews.setState(commentId, state),
      remove: async (commentId) => s.reviews.remove(commentId),
      markSent: async (sessionId, ids) => s.reviews.markSent(sessionId, ids)
    },
    drives: {
      list: async (desktopId) => s.drives.list(desktopId),
      plugIn: (desktopId, folderId) => s.drives.plugIn(desktopId, folderId),
      eject: async (desktopId, letter) => s.drives.eject(desktopId, letter)
    },
    launcher: {
      list: async () => s.launcher.list(),
      create: (input) => s.launcher.create(input),
      connect: async (id) => s.launcher.connect(id),
      disconnect: (id) => s.launcher.disconnect(id),
      rename: async (id, title) => s.launcher.rename(id, title),
      remove: (id) => s.launcher.remove(id),
      show: async () => s.launcher.show(),
      checkAgents: () => s.launcher.checkAgents()
    },
    kanban: {
      list: async (desktopId) => s.kanban.list(desktopId),
      createBoard: async (desktopId, name) => s.kanban.createBoard(desktopId, name),
      renameBoard: async (id, name) => s.kanban.renameBoard(id, name),
      deleteBoard: async (id) => s.kanban.deleteBoard(id),
      addColumn: async (boardId, name) => s.kanban.addColumn(boardId, name),
      renameColumn: async (id, name) => s.kanban.renameColumn(id, name),
      moveColumn: async (id, index) => s.kanban.moveColumn(id, index),
      deleteColumn: async (id) => s.kanban.deleteColumn(id),
      addCard: async (columnId, card) => s.kanban.addCard(columnId, card),
      updateCard: async (id, patch) => s.kanban.updateCard(id, patch),
      moveCard: async (id, columnId, index) => s.kanban.moveCard(id, columnId, index),
      deleteCard: async (id) => s.kanban.deleteCard(id)
    },
    skills: {
      list: async () => s.skills.list(),
      install: (path) => s.skills.install(path),
      remove: (id) => s.skills.remove(id),
      setEnabled: async (id, enabled) => s.skills.setEnabled(id, enabled)
    },
    mcp: {
      list: async () => s.mcp.list(),
      add: async (input) => s.mcp.add(input),
      update: async (id, input) => s.mcp.update(id, input),
      remove: async (id) => s.mcp.remove(id),
      setEnabled: async (id, enabled) => s.mcp.setEnabled(id, enabled),
      test: (id) => s.mcp.test(id),
      probe: (input) => s.mcp.probe(input),
      setToolEnabled: async (id, tool, enabled) => s.mcp.setToolEnabled(id, tool, enabled)
    },
    profiles: {
      list: async () => s.teamService.listProfiles(),
      create: async (input) => s.teamService.createProfile(input),
      update: async (id, input) => s.teamService.updateProfile(id, input),
      remove: async (id) => s.teamService.removeProfile(id)
    },
    teams: {
      list: async () => s.teamService.listTeams(),
      create: async (input) => s.teamService.createTeam(input),
      update: async (id, input) => s.teamService.updateTeam(id, input),
      remove: async (id) => s.teamService.removeTeam(id)
    },
    rooms: {
      list: async (desktopId) => s.rooms.list(desktopId),
      create: async (desktopId, teamId, cwd) => s.rooms.create(desktopId, teamId, cwd),
      state: async (roomId) => s.rooms.state(roomId),
      remove: (roomId) => s.rooms.remove(roomId),
      rename: async (roomId, title) => s.rooms.rename(roomId, title),
      say: (roomId, text) => s.rooms.say(roomId, text),
      stop: (roomId, profileId) => s.rooms.stop(roomId, profileId)
    },
    notes: {
      list: async (desktopId) => s.notes.list(desktopId),
      add: async (desktopId, text, color) => s.notes.add(desktopId, text, color),
      update: async (id, patch) => s.notes.update(id, patch),
      remove: async (id) => s.notes.remove(id)
    },
    events: {
      query: async (query) => s.eventLog.query(query),
      clear: async (desktopId) => s.eventLog.clear(desktopId)
    },
    recycle: {
      list: async (desktopId) => s.recycle.list(desktopId),
      restore: (id) => s.recycle.restore(id),
      remove: async (id) => s.recycle.remove(id),
      empty: async (desktopId) => s.recycle.empty(desktopId)
    },
    snip: {
      capture: (desktopId, region) => s.screen.capture(desktopId, region),
      save: async (desktopId, dataUrl) => {
        const { data } = parseImageDataUrl(dataUrl)
        const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
        const path = `C:\\Users\\Agent\\Pictures\\Snips\\Snip-${stamp}.png` as VPath
        const filePath = await s.vfs.writeBytes(desktopId, path, Buffer.from(data, 'base64'))
        return { path, filePath }
      }
    },
    processes: { list: async () => s.processes.list(), end: (agentId, desktopId) => s.processes.end(agentId, desktopId) },
    app: {
      version: async () => s.appVersion
    },
    sessions: {
      list: async (desktopId) => s.queries.list(desktopId),
      get: async (id) => s.queries.get(id),
      create: (desktopId, agentId, cwd) => s.sessions.create(desktopId, agentId, cwd),
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
      retry: async (id) => s.sessions.retry(id),
      restartAgent: (id) => s.sessions.restartAgent(id),
      exportTranscript: (id) => s.exporter.export(id)
    },
    a2ui: {
      dispatch: (event) => s.a2ui.dispatch(event),
      deleteSurface: async (sessionId, surfaceId) => s.a2ui.deleteSurface(sessionId, surfaceId),
      moveSurface: async (sessionId, surfaceId, target) => s.a2ui.moveSurface(sessionId, surfaceId, target),
      setSidebarHidden: async (sessionId, surfaceId, hidden) => s.a2ui.setSidebarHidden(sessionId, surfaceId, hidden)
    },
    shell: { openPath: (path) => s.shell.openPath(path) },
    fs: {
      browse: (path) => s.directories.browse(path),
      makeFolder: (parent, name) => s.directories.makeFolder(parent, name),
      nativePicker: async () => s.nativePicker
    },
    dialogs: { pickFiles: () => s.files.pickFiles() }
  }
}
