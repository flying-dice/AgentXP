export { launchAgentXP, WAIT_MS, type AgentXPInstance } from './launch'
export { addProject, addServerAndProfile, removeServer, allowFileWrites, allowTerminal, createWorkspace, desktopIdByTitle, desktopIdOf, fakeAgentScript, listAgents, plugWorkspaceIn, readProtocolEvents, registerAgent, registerFakeAgent, setDefaultAgentByName, type Workspace } from './setup'
export { AsidePane } from './pages/AsidePane'
export { ChatWindow } from './pages/ChatWindow'
export { CodeReviewWindow } from './pages/CodeReviewWindow'
export { CodeWindow } from './pages/CodeWindow'
export { DesktopPage, type AppId } from './pages/DesktopPage'
export { ExplorerWindow } from './pages/ExplorerWindow'
export { FolderBrowserDialog } from './pages/FolderBrowserDialog'
export { LauncherPage } from './pages/LauncherPage'
export { TaskSchedulerWindow } from './pages/TaskSchedulerWindow'
export { TerminalWindow } from './pages/TerminalWindow'
export { see } from './expect'
export { serveFixtureWeb, type WebServer } from './webServer'
export { reconnectDesktop, startConnectedDesktop, type ConnectedDesktop } from './session'
export {
  aguiRuns,
  collapseRuns,
  containsInOrder,
  deltaPaths,
  messageShape,
  outcomeOf,
  payloadOf,
  protocolEvents,
  protocolNames,
  startScriptedDesktop,
  useScriptedAgent,
  type ScriptedAgent,
  type ScriptedDesktop
} from './scripted'
export { setWindowSize, shot } from './verify'
