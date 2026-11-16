/** The apps of the desktop, by kind. The shell mounts `component` in the client area of a window. */
import type { AppKind } from '@shared/desktop'
import AgentManagerApp from './agent-manager/AgentManagerApp.svelte'
import BrowserApp from './browser/BrowserApp.svelte'
import ChatApp from './chat/ChatApp.svelte'
import CodeApp from './code/CodeApp.svelte'
import CodeReviewApp from './code-review/CodeReviewApp.svelte'
import ControlCentreApp from './control-centre/ControlCentreApp.svelte'
import ExplorerApp from './explorer/ExplorerApp.svelte'
import HelpApp from './help/HelpApp.svelte'
import EventViewerApp from './event-viewer/EventViewerApp.svelte'
import NotepadApp from './notepad/NotepadApp.svelte'
import PaintApp from './paint/PaintApp.svelte'
import RecycleBinApp from './recycle-bin/RecycleBinApp.svelte'
import SnippingToolApp from './snipping-tool/SnippingToolApp.svelte'
import StickyNotesApp from './sticky-notes/StickyNotesApp.svelte'
import WordPadApp from './wordpad/WordPadApp.svelte'
import SurfaceApp from './surface/SurfaceApp.svelte'
import TerminalApp from './terminal/TerminalApp.svelte'
import type { AppDefinition } from './types'

export const appRegistry: Record<AppKind, AppDefinition> = {
  chat: { kind: 'chat', title: 'Chat', icon: 'session', description: 'Talk to the agent and follow its work', component: ChatApp },
  explorer: { kind: 'explorer', title: 'Explorer', icon: 'folder', description: 'Browse the workspace and see what the agent touched', component: ExplorerApp },
  notepad: { kind: 'notepad', title: 'Notepad', icon: 'file-text', description: 'Read and edit plain text files', component: NotepadApp },
  code: { kind: 'code', title: 'Code', icon: 'file-code', description: 'View code, review changes and revert them', component: CodeApp },
  terminal: { kind: 'terminal', title: 'Terminal', icon: 'terminal', description: 'Watch the commands the agent runs', component: TerminalApp },
  browser: { kind: 'browser', title: 'Browser', icon: 'globe', description: 'Browse the web together with the agent', component: BrowserApp },
  'control-centre': { kind: 'control-centre', title: 'Control Center', icon: 'options', description: 'Agents, permissions and appearance', component: ControlCentreApp },
  'agent-manager': { kind: 'agent-manager', title: 'Task Manager', icon: 'taskmgr', description: 'Chats, agent processes, terminals and context use', component: AgentManagerApp },
  paint: { kind: 'paint', title: 'Agent Paint', icon: 'paint', description: 'Draw, and watch the agent draw', component: PaintApp },
  wordpad: { kind: 'wordpad', title: 'WordPad', icon: 'wordpad', description: 'Read and write markdown documents', component: WordPadApp },
  'sticky-notes': { kind: 'sticky-notes', title: 'Sticky Notes', icon: 'sticky', description: 'Notes on the desktop, shared with the agent', component: StickyNotesApp },
  'event-viewer': { kind: 'event-viewer', title: 'Event Viewer', icon: 'eventlog', description: 'What the agent and the desktop send each other, as it happens', component: EventViewerApp },
  'snipping-tool': { kind: 'snipping-tool', title: 'Snipping Tool', icon: 'scissors', description: 'Capture part of the screen', component: SnippingToolApp },
  'recycle-bin': { kind: 'recycle-bin', title: 'Recycle Bin', icon: 'recycle', description: 'Changes you reverted, ready to restore', component: RecycleBinApp },
  help: { kind: 'help', title: 'Help and Support', icon: 'help', description: 'Manuals for every app and window', component: HelpApp },
  'code-review': { kind: 'code-review', title: 'Code Review', icon: 'changes', description: 'Review changes with an agent and send its comments to a chat', component: CodeReviewApp },
  surface: { kind: 'surface', title: 'Agent window', icon: 'computer', description: 'A window the agent drew with A2UI', component: SurfaceApp }
}
