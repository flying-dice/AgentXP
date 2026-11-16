/**
 * The agent-facing desktop tools: name, group, description and input schema.
 * Pure (zod only): the MCP child process imports it to list the tools; the handlers live in
 * `<group>Tools.ts` and are only in the main process.
 */
import { z } from 'zod'
import { AGENT_OPENABLE_APPS, type ToolGroup } from '@shared/desktop'
import { REVIEW_SEVERITIES, REVIEW_VERDICTS } from '@shared/review'
import type { ToolContext, ToolResult } from './types'

const app = z.enum(AGENT_OPENABLE_APPS)
const windowId = z.number().int().optional().describe('Window id from desktop_state; default: the focused window of this app')
const windowIdParam = z.number().int().optional().describe('Window id from desktop_state; default: the focused window of this app (else the front-most)')
const path = (what: string) =>
  z.string().min(1).describe(`${what}: a full virtual path such as E:\\src\\index.ts or C:\\Users\\Agent\\notes.md, or relative to your working directory`)

/** Told to agents once, when the MCP server starts: how the file system looks. */
export const DESKTOP_INSTRUCTIONS =
  'You work on a virtual Windows desktop. All paths are virtual paths with a drive letter and backslashes: C:\\ is your private system disk ' +
  '(your home is C:\\Users\\Agent) and projects are USB drives the user plugs in (E:\\, F:\\, ...). Call drives_list to see which drives exist. ' +
  'A drive can be ejected at any time; then every path on it is refused until the user plugs the project in again. ' +
  'Relative paths are relative to your working directory. Tools follow the apps that are open: call desktop_open_app to get more. ' +
  'UI you draw with a2ui_render appears where you choose with target: inline in the chat (short conversational forms), in a sidebar beside the chat ' +
  '(a companion panel), or in its own window (an app-like UI the user keeps open). Sidebar tabs and windows can be closed and reopened by the user, ' +
  'windows show up in desktop_state, and a2ui_delete_surface closes a surface\'s window. ' +
  'If you are asked to do a code review, you are the reviewer of a Code Review window and act as a merge-request reviewer: ' +
  'review_list_changes lists the changed files, review_read_diff shows one file with line numbers, review_add_comment leaves an inline comment ' +
  '(a specific line, a severity of blocker, major, minor or nit, and what is wrong and why), and review_submit ends the review with a verdict and a summary. ' +
  'Comment on real problems (bugs, missing tests, unclear code), not on style you cannot justify, and do not edit files while reviewing; the user passes your comments to a chat to fix. ' +
  'Using web apps (chat, mail, docs) in the Browser: the user signs in themselves in the Browser window and the session persists; you never type passwords or secrets. ' +
  'Loop: browser_read (tree) -> browser_find -> browser_click / browser_type / browser_press -> browser_wait -> browser_read. browser_read pages through the whole document (follow nextOffset), ' +
  'refs reset when the page navigates, and long lists load more when you browser_scroll, then read again.'

const STICKY_COLOR = z.enum(['yellow', 'blue', 'green', 'pink', 'purple', 'white'])

const PAINT_OP = z.object({
  type: z.enum(['line', 'rect', 'ellipse', 'path', 'fill', 'text', 'clear']),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1).max(5000).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  color: z.string().optional().describe('CSS colour, default black'),
  fill: z.union([z.boolean(), z.string()]).optional().describe('rect, ellipse: a fill colour, or true to fill with `color`'),
  width: z.number().min(1).max(200).optional().describe('Stroke width, default 2'),
  text: z.string().optional(),
  font: z.string().optional()
})

export interface ToolDefinition {
  group: ToolGroup
  description: string
  input: z.ZodObject
}

export const TOOL_DEFS = {
  desktop_state: {
    group: 'shell',
    description: 'The current desktop as JSON: drives, open windows (with what each shows), focus, enabled tool groups, pause and control flags.',
    input: z.object({})
  },
  drives_list: {
    group: 'shell',
    description: 'List the drives of this desktop. C: is your private system disk; projects are USB drives the user plugs in (E:, F:, ...) and can eject at any time.',
    input: z.object({})
  },
  desktop_open_app: {
    group: 'shell',
    description:
      'Open an app window on the desktop. Opening an app enables its tools (Terminal: terminal_*, Browser: browser_*, Notepad: notepad_*, Code: code_*, Explorer: fs_*, Agent Paint: paint_*, WordPad: wordpad_*, Sticky Notes: notes_*, Event Viewer: events_query, Snipping Tool: screen_capture, Recycle Bin: recycle_*).',
    input: z.object({
      app,
      path: z.string().optional().describe('explorer, notepad, code, wordpad, paint: virtual path to show (E:\\src, relative to your working directory, ...); an Explorer without a path shows Computer (the drives)'),
      url: z.string().optional().describe('browser: address to load')
    })
  },
  desktop_close_app: {
    group: 'shell',
    description: 'Close an app window. Its tools disappear when no window of that app is left.',
    input: z.object({ window: z.number().int().optional().describe('Window id'), app: app.optional().describe('Closes the windows of this app when no window id is given') })
  },
  desktop_focus_app: {
    group: 'shell',
    description: 'Bring an app window to the front (restores it when minimised).',
    input: z.object({ window: z.number().int().optional().describe('Window id'), app: app.optional() })
  },
  fs_list: {
    group: 'fs.read',
    description: 'List one directory (folders first; .git and node_modules are hidden). Needs the Explorer or Code app.',
    input: z.object({ path: z.string().optional().describe('Directory as a virtual path or relative to your working directory; default: your working directory') })
  },
  fs_find: {
    group: 'fs.read',
    description: 'Find files and folders by name below a directory (.git and node_modules are skipped). Case-insensitive; `*` matches any characters. Needs the Explorer or Code app.',
    input: z.object({
      pattern: z.string().min(1).describe('Name or glob such as "*.test.ts" or "readme"'),
      path: z.string().optional().describe('Directory to search, as a virtual path or relative to your working directory; default: your working directory'),
      limit: z.number().int().min(1).max(500).optional().describe('Maximum results (default 100)')
    })
  },
  notepad_open: {
    group: 'notepad',
    description: 'Show a file in a Notepad window (opens one when needed).',
    input: z.object({ path: path('File') })
  },
  notepad_read: {
    group: 'notepad',
    description: 'Read the saved text of the file a Notepad window shows (or of `path`).',
    input: z.object({ path: z.string().optional().describe('File as a virtual path or relative to your working directory; default: the file of the focused Notepad') })
  },
  code_open: {
    group: 'code',
    description: 'Open a file in the Code app (opens the app when needed) and show it, optionally at a line.',
    input: z.object({ path: path('File'), line: z.number().int().min(1).optional() })
  },
  code_reveal: {
    group: 'code',
    description: 'Scroll the Code app to a line range of a file and select it, so the user sees what you mean.',
    input: z.object({ path: path('File'), startLine: z.number().int().min(1), endLine: z.number().int().min(1).optional() })
  },
  code_show_diff: {
    group: 'code',
    description: 'Show the recorded change of a file you edited in the Code app\'s changes list.',
    input: z.object({ path: path('File') })
  },
  terminal_run: {
    group: 'terminal',
    description: 'Run a shell command and wait for it (it runs in a real folder behind a drive; ejected drives are refused). Output appears in the Terminal app and is returned (last 20k characters).',
    input: z.object({
      command: z.string().min(1),
      cwd: z.string().optional().describe('Working directory as a virtual path or relative to your working directory; default: your working directory'),
      timeoutSeconds: z.number().int().min(1).max(600).optional().describe('Default 60')
    })
  },
  terminal_read: {
    group: 'terminal',
    description: 'Read the last lines printed by terminal_run on this desktop.',
    input: z.object({ lines: z.number().int().min(1).max(500).optional().describe('Default 50') })
  },
  browser_navigate: {
    group: 'browser',
    description:
      'Load a web page (http or https) in a Browser window and wait until it has loaded. Using a web app (chat, mail, docs): navigate once, then loop browser_read (mode tree) -> browser_find -> browser_click / browser_type / browser_press -> browser_wait -> browser_read. The user signs in themselves in the window (the session is kept); never type passwords.',
    input: z.object({ url: z.string().min(1), window: windowId })
  },
  browser_read: {
    group: 'browser',
    description:
      'Read the WHOLE page in pages of lines: all frames and shadow roots, content below the fold included (off-screen nodes are marked [off-screen]). mode "tree" (default) is an accessibility outline: role, name, value, state, and a [ref] on every interactive node; use the refs with browser_click, browser_type, browser_select, browser_scroll and browser_wait. mode "text" is plain readable text. When the result says nextOffset, call again with that offset to read on. Refs stay valid until the page navigates. Lazily loaded lists (older messages) only appear after browser_scroll: scroll, then read again.',
    input: z.object({
      mode: z.enum(['tree', 'text']).optional().describe('Default tree'),
      offset: z.number().int().min(0).optional().describe('First line to return (from nextOffset); default 0'),
      limit: z.number().int().min(1).max(500).optional().describe('Most lines per page; default 150 (a page also stops at about 12k characters)'),
      window: windowId
    })
  },
  browser_find: {
    group: 'browser',
    description:
      'Find elements without reading the whole page: by visible `text` (matches names and values; returns the element around the text), or by ARIA `role` (textbox, button, link, tab, option, menuitem, listitem, ...) and optional `name` fragment. Returns refs with the text around each match. Use it to get the ref of a channel, a composer, a button or one message.',
    input: z.object({
      text: z.string().min(1).optional(),
      role: z.string().min(1).optional(),
      name: z.string().optional().describe('With role: part of the accessible name'),
      limit: z.number().int().min(1).max(50).optional().describe('Default 20'),
      window: windowId
    })
  },
  browser_screenshot: {
    group: 'browser',
    description: 'Take a PNG screenshot of the page as it is shown (the visible part only). Prefer browser_read to know what is on the page.',
    input: z.object({ window: windowId })
  },
  browser_click: {
    group: 'browser',
    description: 'Click the element `ref` (from browser_read or browser_find) with a real mouse click at the centre of its box, after scrolling it into view. Works on links, buttons, tabs, menu items and custom widgets. Then browser_wait or browser_read to see the result.',
    input: z.object({
      ref: z.number().int().min(1),
      button: z.enum(['left', 'right', 'middle']).optional().describe('Default left'),
      double: z.boolean().optional().describe('Double click'),
      window: windowId
    })
  },
  browser_type: {
    group: 'browser',
    description:
      'Type text with real input events (works on inputs, textareas, rich-text and contenteditable composers, React forms). With `ref` it focuses that field first, without it it types into the element that has the focus. It REPLACES the content (selects all, then inserts); to add to the content press End first via browser_press. `submit` presses Enter afterwards (sends a message, runs a search). Newlines in `text` are inserted as typed; for a composer where Enter sends, use Shift+Enter via browser_press for line breaks. Password fields are refused.',
    input: z.object({ ref: z.number().int().min(1).optional(), text: z.string(), submit: z.boolean().optional(), window: windowId })
  },
  browser_press: {
    group: 'browser',
    description:
      'Press keys on the focused element. A chord joins keys with "+": "Enter", "Escape", "Tab", "ArrowDown", "Control+K" (quick switcher), "Shift+Enter", "Control+A", "F5". Separate chords with spaces to press them one after the other: "ArrowDown ArrowDown Enter". Use it to send with Enter, close dialogs with Escape, move in menus with arrows.',
    input: z.object({ keys: z.string().min(1), window: windowId })
  },
  browser_scroll: {
    group: 'browser',
    description:
      'Scroll with the mouse wheel: the page, or the scrollable container under `ref` (give the ref of the list or one of its items). `direction` up, down, left, right, top or bottom; `amount` in pixels (default 80% of the viewport). Scrolling up in a chat loads older messages; wait a moment and browser_read again.',
    input: z.object({
      direction: z.enum(['up', 'down', 'left', 'right', 'top', 'bottom']).optional().describe('Default down'),
      amount: z.number().int().min(1).max(100000).optional(),
      ref: z.number().int().min(1).optional(),
      window: windowId
    })
  },
  browser_wait: {
    group: 'browser',
    description:
      'Wait until `text` appears anywhere on the page (all frames, shadow roots included), or until the element `ref` is visible again, or (with neither) until the page has finished loading. Gives up after `timeoutMs` (default 5000, at most 30000) and says so. Use it after clicking or sending, before reading.',
    input: z.object({ text: z.string().min(1).optional(), ref: z.number().int().min(1).optional(), timeoutMs: z.number().int().min(100).max(30000).optional(), window: windowId })
  },
  browser_select: {
    group: 'browser',
    description: 'Choose an option of a native drop-down list (<select>) `ref` by its visible label or value. For custom drop-downs (role combobox, listbox) click the control, then click the option.',
    input: z.object({ ref: z.number().int().min(1), option: z.string().min(1), window: windowId })
  },
  browser_tabs: {
    group: 'browser',
    description:
      'Manage the tabs of a Browser window. action list: the tabs with their numbers (the active one is marked). new: open a tab (optional `url`) and make it active. switch: make tab number `tab` the active one; browser_* tools always act on the active tab. close: close tab number `tab` (default the active one).',
    input: z.object({ action: z.enum(['list', 'new', 'switch', 'close']), url: z.string().optional(), tab: z.number().int().min(1).optional(), window: windowId })
  },
  browser_back: {
    group: 'browser',
    description: 'Go back one page in the Browser window.',
    input: z.object({ window: windowId })
  },
  browser_forward: {
    group: 'browser',
    description: 'Go forward one page in the Browser window.',
    input: z.object({ window: windowId })
  },
  browser_reload: {
    group: 'browser',
    description: 'Reload the page and wait until it has loaded. Refs from before the reload are no longer valid.',
    input: z.object({ window: windowId })
  },
  paint_draw: {
    group: 'paint',
    description:
      'Draw on the Agent Paint canvas (origin top-left, pixels). Ops run in order: line (points: 2+), rect and ellipse (x, y, w, h; optional fill colour), path (points: polyline), fill (flood fill at x, y), text (x, y, text, font such as "20px sans-serif"), clear (whole canvas, colour = background).',
    input: z.object({
      ops: z.array(PAINT_OP).min(1).max(500),
      windowId: windowIdParam
    })
  },
  paint_read: {
    group: 'paint',
    description: 'Read the Agent Paint canvas as a PNG image.',
    input: z.object({ windowId: windowIdParam })
  },
  paint_clear: {
    group: 'paint',
    description: 'Clear the Agent Paint canvas to white (or to `color`).',
    input: z.object({ color: z.string().optional(), windowId: windowIdParam })
  },
  paint_resize: {
    group: 'paint',
    description: 'Resize the Agent Paint canvas (the picture is kept at the top-left).',
    input: z.object({ width: z.number().int().min(1).max(4096), height: z.number().int().min(1).max(4096), windowId: windowIdParam })
  },
  wordpad_open: {
    group: 'wordpad',
    description: 'Show a markdown file in a WordPad window (opens one when needed).',
    input: z.object({ path: path('File'), windowId: windowIdParam })
  },
  wordpad_read: {
    group: 'wordpad',
    description: 'Read the markdown the WordPad window shows right now, including edits the user has not saved.',
    input: z.object({ windowId: windowIdParam })
  },
  wordpad_write: {
    group: 'wordpad',
    description: 'Write a markdown file and show it in WordPad. The write is recorded as one of your file changes (Changes list).',
    input: z.object({ path: path('File'), markdown: z.string(), windowId: windowIdParam })
  },
  notes_list: {
    group: 'notes',
    description: 'List the sticky notes of this desktop.',
    input: z.object({})
  },
  notes_add: {
    group: 'notes',
    description: 'Put a sticky note on the desktop. With `plan: true` the note mirrors this chat\'s plan (task list) live; its text is generated.',
    input: z.object({ text: z.string().default(''), color: STICKY_COLOR.optional(), plan: z.boolean().optional() })
  },
  notes_update: {
    group: 'notes',
    description: 'Change the text or colour of a sticky note.',
    input: z.object({ id: z.number().int(), text: z.string().optional(), color: STICKY_COLOR.optional() })
  },
  notes_remove: {
    group: 'notes',
    description: 'Remove a sticky note.',
    input: z.object({ id: z.number().int() })
  },
  events_query: {
    group: 'events',
    description: 'Search the protocol events of this desktop (ACP, AG-UI, MCP), newest last. Returns one compact line per event.',
    input: z.object({
      sessionId: z.number().int().optional().describe('Only events of this chat'),
      source: z.enum(['acp', 'ag-ui', 'mcp']).optional(),
      level: z.enum(['info', 'warning', 'error']).optional(),
      text: z.string().optional().describe('Case-insensitive text in the event name or payload'),
      limit: z.number().int().min(1).max(200).optional().describe('Default 50')
    })
  },
  screen_capture: {
    group: 'snip',
    description: 'Take a PNG screenshot of the whole desktop, or of one window\'s area.',
    input: z.object({ windowId: z.number().int().optional().describe('Window id from desktop_state; default: the whole desktop') })
  },
  recycle_list: {
    group: 'recycle',
    description: 'List the reverted changes in the Recycle Bin.',
    input: z.object({})
  },
  recycle_restore: {
    group: 'recycle',
    description: 'Restore a reverted change: its file content is written back and recorded as a new change.',
    input: z.object({ id: z.number().int() })
  },
  review_list_changes: {
    group: 'review',
    description: 'List the changed files of the review (status, added and removed lines, open comments) against the review\'s base ref. Only works in the review session of a Code Review window.',
    input: z.object({})
  },
  review_read_diff: {
    group: 'review',
    description:
      'Read one changed file as a diff with line numbers: "+ 12 | text" is an added line (new line 12), "- 8 | text" a removed line (old line 8), "  12 | text" context. Comment on new lines with side "new", on removed lines with side "old".',
    input: z.object({ path: z.string().min(1).describe('Path from review_list_changes (relative to the review folder)') })
  },
  review_add_comment: {
    group: 'review',
    description: 'Leave an inline review comment on a line (or line range) of a changed file, like a merge-request comment. Returns the comment id.',
    input: z.object({
      path: z.string().min(1).describe('Path from review_list_changes'),
      line: z.number().int().min(1).describe('First line, numbered as in review_read_diff'),
      endLine: z.number().int().min(1).optional().describe('Last line of a range; default: the same line'),
      side: z.enum(['old', 'new']).optional().describe('"new" (default) for added and context lines, "old" for removed lines'),
      severity: z.enum(REVIEW_SEVERITIES).optional().describe('blocker (must fix), major, minor (default) or nit'),
      body: z.string().min(1).describe('What is wrong and why, and how to fix it'),
      replyTo: z.number().int().optional().describe('The id of a comment to answer')
    })
  },
  review_submit: {
    group: 'review',
    description: 'Finish the review with a verdict and a short summary. The user sees it as the banner of the Code Review window. Submitting again replaces the verdict.',
    input: z.object({ verdict: z.enum(REVIEW_VERDICTS), body: z.string().describe('A short summary of the review') })
  }
} as const satisfies Record<string, ToolDefinition>

export type ToolName = keyof typeof TOOL_DEFS
export type ToolArgs<N extends ToolName> = z.infer<(typeof TOOL_DEFS)[N]['input']>
export type ToolHandlers<N extends ToolName> = { [K in N]: (args: ToolArgs<K>, context: ToolContext) => Promise<ToolResult> }

export interface ToolSpec extends ToolDefinition {
  name: ToolName
}

export const TOOL_SPECS: readonly ToolSpec[] = (Object.keys(TOOL_DEFS) as ToolName[]).map((name) => ({ name, ...TOOL_DEFS[name] }))

export const isToolName = (name: string): name is ToolName => Object.hasOwn(TOOL_DEFS, name)

/** The tools of the enabled groups. */
export const specsForGroups = (groups: readonly ToolGroup[]): ToolSpec[] => TOOL_SPECS.filter((s) => groups.includes(s.group))
