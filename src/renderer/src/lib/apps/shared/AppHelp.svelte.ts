/**
 * The in-app Help of every app: the standard `Help` menu (View Help F1, About <App>) and the state of the About box.
 * An app makes one `new AppHelp(host, 'notepad')`, puts `help.menu()` last in its menu bar and renders `<AppAbout {help} />`.
 * View Help opens the shared Help window on the topic of the app (titled "<App> Help").
 */
import { APP_DISPLAY_NAMES, type AppKind } from '@shared/desktop'
import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
import { chatPaneItem, helpMenu } from '../../kit/molecules/standardMenu'
import type { IconName } from '../../kit/atoms/icons'
import type { DesktopHost } from '../types'
import { helpTopicFor } from '../help/helpFocus'

/** The icon and the line of each app's About box. */
export const ABOUT: Record<AppKind, { icon: IconName; description: string }> = {
  chat: { icon: 'session', description: 'Talk to the agent and follow its work.' },
  explorer: { icon: 'folder', description: 'Browse the workspace and see what the agent touched.' },
  notepad: { icon: 'file-text', description: 'Read and edit plain text files.' },
  code: { icon: 'file-code', description: 'View code, review changes and revert them.' },
  terminal: { icon: 'terminal', description: 'Watch the commands the agent runs.' },
  browser: { icon: 'globe', description: 'Browse the web together with the agent.' },
  'control-centre': { icon: 'options', description: 'Agents, permissions and appearance.' },
  'agent-manager': { icon: 'taskmgr', description: 'Chats, agent processes, terminals and context use.' },
  paint: { icon: 'paint', description: 'Draw, and watch the agent draw.' },
  wordpad: { icon: 'wordpad', description: 'Read and write markdown documents.' },
  'sticky-notes': { icon: 'sticky', description: 'Notes on the desktop, shared with the agent.' },
  kanban: { icon: 'kanban', description: 'Boards of cards to track work, shared with the agents.' },
  'event-viewer': { icon: 'eventlog', description: 'What the agent and the desktop send each other, as it happens.' },
  'snipping-tool': { icon: 'scissors', description: 'Capture part of the screen.' },
  'recycle-bin': { icon: 'recycle', description: 'Changes you reverted, ready to restore.' },
  help: { icon: 'help', description: 'Manuals for every app and window.' },
  'code-review': { icon: 'changes', description: 'Review changes with an agent and send its comments to a chat.' },
  teams: { icon: 'user', description: 'Profiles and teams of agents, and their chat rooms.' },
  'team-chat': { icon: 'session', description: 'A chat room where a team of agents answers under their own names.' },
  surface: { icon: 'computer', description: 'A window the agent drew with A2UI.' }
}

export class AppHelp {
  about = $state(false)
  version = $state('')
  readonly kind: AppKind
  private readonly host: DesktopHost

  constructor(host: DesktopHost, kind: AppKind) {
    this.host = host
    this.kind = kind
  }

  get name(): string {
    return APP_DISPLAY_NAMES[this.kind]
  }

  get icon(): IconName {
    return ABOUT[this.kind].icon
  }

  get description(): string {
    return ABOUT[this.kind].description
  }

  /**
   * View Help (F1): the Help window on this app's topic. With a control focused that the manual lists, Help opens at the table row of
   * that control (UX-205); otherwise at the top of the topic.
   */
  open = (): void => void this.host.openApp({ app: 'help', topic: helpTopicFor(this.kind) })

  /** The Help window on this app's topic, scrolled to one of its sections (`troubleshooting`): the error page's Help link. */
  openSection = (section: string): void => void this.host.openApp({ app: 'help', topic: `${this.kind}#${section}` })

  showAbout = (): void => {
    this.about = true
    if (!this.version) void this.host.api.app.version().then((v) => (this.version = v), () => {})
  }

  /** `View > Chat pane (Ctrl+Shift+C)` of the window `windowId`: the shell hosts the pane, the app only lists the item. */
  paneItem(windowId: number): MenuItemDef {
    return chatPaneItem(this.kind, { checked: this.host.chatPaneOpen(windowId), toggle: () => this.host.toggleChatPane(windowId) })
  }

  /** A View menu that has only the chat pane item (apps without a View menu of their own). */
  viewMenu(windowId: number): MenuDef {
    return { label: '&View', items: [this.paneItem(windowId)] }
  }

  /** The standard Help menu: always the last menu of the bar. */
  menu(): MenuDef {
    return helpMenu({ app: this.kind, name: this.name, onhelp: this.open, onabout: this.showAbout })
  }
}
