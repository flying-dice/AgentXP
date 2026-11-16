/**
 * Plain titles for the agent's tools. An agent names its tools like a program does (`fs.read_text_file`,
 * `agent7.browser_read`); the person sees what the tool does ("Read a file", "Read the page"). Unknown names have no
 * plain title: callers keep what the agent said.
 */

const TITLES: Record<string, string> = {
  // File system and commands (the agent's own tools)
  'fs.read_text_file': 'Read a file',
  'fs.write_text_file': 'Change a file',
  terminal: 'Run a command',
  // Agent7 desktop tools: the part after `agent7.`
  browser_navigate: 'Open a web page',
  browser_read: 'Read the page',
  browser_find: 'Find something on the page',
  browser_screenshot: 'Take a picture of the page',
  browser_click: 'Click on the page',
  browser_type: 'Type on the page',
  browser_press: 'Press a key on the page',
  browser_scroll: 'Scroll the page',
  browser_wait: 'Wait for the page',
  browser_select: 'Choose an item on the page',
  browser_tabs: 'Manage the tabs of the browser',
  browser_back: 'Go back one page',
  browser_forward: 'Go forward one page',
  browser_reload: 'Reload the page',
  review_add_comment: 'Add a review comment',
  review_list_changes: 'List the changes to review',
  review_read_diff: 'Read a change',
  review_submit: 'Finish the review',
  terminal_run: 'Run a command',
  desktop_state: 'Look at the desktop',
  screen_capture: 'Take a picture of the screen',
  events_query: 'Read the event log',
  recycle_list: 'List the Recycle Bin',
  recycle_restore: 'Restore a file from the Recycle Bin',
  notes_list: 'List the sticky notes',
  notes_add: 'Add a sticky note',
  notes_update: 'Change a sticky note',
  notes_remove: 'Remove a sticky note',
  a2ui_render: 'Show a form or a window',
  a2ui_delete_surface: 'Remove a form or a window'
}

/** The tool part of a name: `agent7.browser_read` and `mcp__agent7__browser_read` both give `browser_read`. */
const toolPart = (name: string): string => name.replace(/^mcp__.*?__/, '').replace(/^[a-z0-9_-]+\./i, '')

/** The plain title of a tool by the name the agent gave it, or null when there is none. */
export function plainToolTitle(name: string): string | null {
  const trimmed = name.trim()
  return TITLES[trimmed] ?? TITLES[toolPart(trimmed)] ?? null
}

/** The title to show for a tool: the plain one, else what the agent said. */
export const toolTitleOr = (name: string): string => plainToolTitle(name) ?? name
