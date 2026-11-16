/** The apps of the desktop, by kind. The shell mounts `component` in the client area of a window. */
import type { AppKind } from '@shared/desktop'
import AgentManagerApp from './agent-manager/AgentManagerApp.svelte'
import BrowserApp from './browser/BrowserApp.svelte'
import ChatApp from './chat/ChatApp.svelte'
import CodeApp from './code/CodeApp.svelte'
import ControlCentreApp from './control-centre/ControlCentreApp.svelte'
import ExplorerApp from './explorer/ExplorerApp.svelte'
import NotepadApp from './notepad/NotepadApp.svelte'
import TerminalApp from './terminal/TerminalApp.svelte'
import type { AppDefinition } from './types'

export const appRegistry: Record<AppKind, AppDefinition> = {
  chat: { kind: 'chat', title: 'Chat', icon: 'session', description: 'Talk to the agent and follow its work', component: ChatApp },
  explorer: { kind: 'explorer', title: 'Explorer', icon: 'folder', description: 'Browse the workspace and see what the agent touched', component: ExplorerApp },
  notepad: { kind: 'notepad', title: 'Notepad', icon: 'file-text', description: 'Read and edit plain text files', component: NotepadApp },
  code: { kind: 'code', title: 'Code', icon: 'file-code', description: 'View code, review changes and revert them', component: CodeApp },
  terminal: { kind: 'terminal', title: 'Terminal', icon: 'terminal', description: 'Watch the commands the agent runs', component: TerminalApp },
  browser: { kind: 'browser', title: 'Browser', icon: 'globe', description: 'Browse the web together with the agent', component: BrowserApp },
  'control-centre': { kind: 'control-centre', title: 'Control Centre', icon: 'options', description: 'Agents, permissions and appearance', component: ControlCentreApp },
  'agent-manager': { kind: 'agent-manager', title: 'Agent Manager', icon: 'agent', description: 'Agent processes, chats and context use', component: AgentManagerApp }
}
