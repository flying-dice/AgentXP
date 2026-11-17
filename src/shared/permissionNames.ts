import type { ToolGroup } from './desktop'

/**
 * One name for each permission, wherever it appears: the chips of the top bar, the rows of Control Center, the permission
 * dialog box and the manuals. "(Terminal)" is only a tooltip (`PERMISSION_HINTS`), never part of the name.
 */
export const PERMISSION_NAMES: Record<Exclude<ToolGroup, 'shell'>, string> = {
  'fs.read': 'Read files',
  'fs.write': 'Write files',
  terminal: 'Run commands',
  code: 'Code',
  notepad: 'Notepad',
  browser: 'Browser',
  paint: 'Agent Paint',
  wordpad: 'WordPad',
  notes: 'Notes',
  events: 'Events',
  snip: 'Screen capture',
  recycle: 'Recycle Bin',
  board: 'Kanban boards',
  diagrams: 'Agent Diagrams',
  review: 'Code review',
  scheduler: 'Task Scheduler',
  teams: 'Teams',
  rooms: 'Team chat',
  settings: 'Control Center',
  taskmgr: 'Task Manager',
  help: 'Help'
}

/** The tooltip of a permission name that has a longer form. */
export const PERMISSION_HINTS: Partial<Record<Exclude<ToolGroup, 'shell'>, string>> = {
  terminal: 'Run commands (Terminal)'
}

/** What each setting means, in the words of the row and the manual. */
export const DECISION_SENTENCES = { allow: 'runs without asking', ask: 'asks you each time', deny: 'never runs' } as const
