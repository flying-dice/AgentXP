/**
 * The agent-facing desktop tools: name, group, description and input schema.
 * Pure (zod only): the MCP child process imports it to list the tools; the handlers live in
 * `<group>Tools.ts` and are only in the main process.
 */
import { z } from 'zod'
import { AGENT_OPENABLE_APPS, type ToolGroup } from '@shared/desktop'
import { REVIEW_SEVERITIES, REVIEW_VERDICTS } from '@shared/review'
import { SHOW_NOTE_MAX } from '@shared/show'
import type { ToolContext, ToolResult } from './types'
import { ADMIN_TOOL_DEFS } from './adminCatalog'

const app = z.enum(AGENT_OPENABLE_APPS)
const windowId = z.number().int().optional().describe('Window id from desktop_state; default: the focused window of this app')
const windowIdParam = z.number().int().optional().describe('Window id from desktop_state; default: the focused window of this app (else the front-most)')
const path = (what: string) =>
  z.string().min(1).describe(`${what}: a full virtual path such as E:\\src\\index.ts or C:\\Users\\Agent\\notes.md, or relative to your working directory`)

/**
 * How to work on the desktop: quietly. The desktop is the operator's environment, not the agent's
 * (`docs/AGENT_PRESENCE.md`): reads, searches, edits and commands open nothing, and only output apps open windows, behind
 * the operator's window. The operator follows the work in the chat, the activity feed and the top bar.
 */
export const WORK_QUIETLY_INSTRUCTIONS =
  'Work quietly: this desktop is the user\'s screen, not yours. Your own built-in tools and the AgentXP tools are both fine for reading, searching, ' +
  'editing and running commands, and neither opens anything on the user\'s screen: the user follows your work in the chat (each step has a Show in Code, ' +
  'Show diff or Show in Terminal link), in the activity list and in the top bar. AgentXP tools record more for the user: code_edit and code_write record ' +
  'each change in the Changes pane (with Revert), terminal_run records the command and its output for the Terminal app, fs_find, code_search and code_read ' +
  'return what they find with paths and line numbers. Never use a Bash or shell sub-agent (a sub-agent has no shell here and can only pretend to run commands; ' +
  'do shell work yourself). Scheduling: scheduler_* (Task Scheduler), never cron, at or schtasks. ' +
  'Output apps open behind the user\'s window, with a flashing taskbar button, and never take the focus: the Browser (browser_*), Agent Paint, ' +
  'Agent Diagrams, WordPad, Code Review and windows you draw with a2ui_render. Open an app only to put your output in it or when the user asks, ' +
  'never just so the user can watch you work. To point the user at something, call show: one target (lines of a file, a change, a review comment, ' +
  'a card, a diagram shape, a page element or a window) and always a short note saying why. Use it sparingly, only when you want the user to look now; ' +
  'if the user is in another chat it becomes a request they can accept later. '

/** The shell terminal_run uses on this host, so the agent writes commands it understands. */
export function hostShellInstructions(platform: string): string {
  const shell = platform === 'win32' ? 'Windows cmd.exe' : `${platform === 'darwin' ? 'macOS' : 'Linux'} /bin/sh`
  return (
    `The desktop looks like Windows, but terminal_run runs in the real ${shell} of the user's computer: write commands for that shell` +
    `${platform === 'win32' ? '' : ' (ls, grep, git; not dir or schtasks)'}. The shell does not understand drive letters: set cwd to a virtual path ` +
    'and use paths relative to it inside the command.'
  )
}

/**
 * How to work on the desktop, how the desktop and its file system look. Agents get it three ways, because not every agent
 * reads every channel: appended to their system prompt (ACP `_meta.systemPrompt`), as the agentxp MCP server's
 * instructions, and (the "work quietly" part) in the briefing of a chat's first prompt.
 */
export function desktopInstructions(platform: string): string {
  return `${WORK_QUIETLY_INSTRUCTIONS}${hostShellInstructions(platform)} ${DESKTOP_INSTRUCTIONS}`
}

/** The system prompt addition of a desktop chat: a heading, so the agent sees where AgentXP's part starts. */
export function desktopSystemPrompt(platform: string): string {
  return `# Working on the AgentXP desktop

${desktopInstructions(platform)}`
}

/** The part of the first prompt's briefing that every agent reads, even one that ignores system prompt additions and MCP instructions. */
export function desktopBriefing(platform: string): string {
  return `## Working on the AgentXP desktop
${WORK_QUIETLY_INSTRUCTIONS}${hostShellInstructions(platform)}`
}

/** How the desktop and its file system look, and how to use its apps. */
export const DESKTOP_INSTRUCTIONS =
  'You work on a virtual Windows desktop. All paths are virtual paths with a drive letter and backslashes: C:\\ is your private system disk ' +
  '(your home is C:\\Users\\Agent) and projects are USB drives the user plugs in (E:\\, F:\\, ...). Call drives_list to see which drives exist. ' +
  'A drive can be ejected at any time; then every path on it is refused until the user plugs the project in again. ' +
  'Relative paths are relative to your working directory. Every tool is available whether or not its app is open, as far as the permissions in Control Center allow; ' +
  'only the tools of an output app that need its window (browser_*, paint_*, diagram_*, review_*) wait until it is open (desktop_open_app, review_open). ' +
  'UI you draw with a2ui_render appears where you choose with target: inline in the chat (short conversational forms), in a sidebar beside the chat ' +
  '(a companion panel), or in its own window (an app-like UI the user keeps open). Sidebar tabs and windows can be closed and reopened by the user, ' +
  'windows show up in desktop_state, and a2ui_delete_surface closes a surface\'s window. ' +
  'If you are asked to do a code review (in any chat, also the chat pane of the Code window), do it in a Code Review window and act as a merge-request reviewer: ' +
  'call review_open with the project path (it opens a Code Review window behind the user\'s window, or reuses the open one), then review_list_changes lists the changed files, ' +
  'review_read_diff shows one file with line numbers, review_add_comment leaves an inline comment ' +
  '(a specific line, a severity of blocker, major, minor or nit, and what is wrong and why) that appears in that window, and review_submit ends the review with a verdict and a summary. ' +
  'Never list review comments as plain text in the chat instead of adding them. When the review is submitted, tell the user the verdict and a short summary of the comments in the chat they asked in. ' +
  'Comment on real problems (bugs, missing tests, unclear code), not on style you cannot justify, and do not edit files while reviewing; the user passes your comments to a chat to fix. ' +
  'In a chat pane (an aside: the small chat inside an app window, whose prompts carry `appContext` in the desktop state: windowId, app, the open file, the selection, the page) ' +
  'keep your answers short and local to that app context, a few sentences or a short list: "explain this" means the selection or the open file in appContext. ' +
  'Do not start side projects there; act only when asked, and pass `window` = appContext.windowId to tools that take a window (the browser_* tools drive that Browser window). ' +
  'Chats outlive their windows: chats_list lists the chats of this desktop (what Start > Recent chats shows), chat_read reads one\'s transcript and chat_open opens one again in a Chat window with its history. ' +
  'Work tracking: the board_* tools (always available, the Kanban window need not be open) read and write the desktop\'s Kanban boards. Teams share a board: ' +
  'look at it (board_get) before you start, take or create a card for your work (assignee = your own name), move it to "Doing" when you start and to "Done" when you finish, and keep descriptions short. ' +
  'Using web apps (chat, mail, docs) in the Browser: the user signs in themselves in the Browser window and the session persists; you never type passwords or secrets. ' +
  'Loop: browser_read (tree) -> browser_find -> browser_click / browser_type / browser_press -> browser_wait -> browser_read. browser_read pages through the whole document (follow nextOffset), ' +
  'refs reset when the page navigates, and long lists load more when you browser_scroll, then read again. ' +
  'Everything a person can do in the AgentXP apps you can do with tools, no window needed: scheduler_* (Task Scheduler), profile_* and team_* (Teams), ' +
  'room_* (team chat rooms), settings_*, agent_*, skill_* and mcp_* (Control Center), taskmgr_* (Task Manager) and help_search / help_read (the manuals: ' +
  'use them to answer questions about AgentXP). Changes to Control Center and ending an agent program always ask the user first.'

const BOARD_REF = z.union([z.number().int(), z.string()]).describe('Board id, or its name')

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

// ---- Agent Diagrams (the shapes are validated again by the Diagrams window, which knows the stencils)
const DIAGRAM_STYLE = z
  .object({
    fill: z.string().optional().describe('CSS colour or "none"'),
    gradient: z.boolean().optional(),
    stroke: z.string().optional().describe('Line colour or "none"'),
    strokeWidth: z.number().min(0).max(20).optional(),
    dash: z.enum(['solid', 'dashed', 'dotted', 'dash-dot']).optional(),
    opacity: z.number().min(0).max(1).optional(),
    shadow: z.boolean().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().min(4).max(144).optional(),
    fontColor: z.string().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    startMarker: z.string().optional().describe('Connectors: none, arrow, open-arrow, triangle, filled-triangle, diamond, filled-diamond, circle, filled-circle, erd-one, erd-many, erd-one-only, erd-zero-one, erd-one-many, erd-zero-many'),
    endMarker: z.string().optional().describe('Connectors: as startMarker'),
    rounded: z.boolean().optional().describe('Connectors: rounded corners')
  })
  .describe('Style overrides; only the keys you give change')
const DIAGRAM_DATA = z.record(z.string(), z.unknown()).describe('Stencil data (UML class: stereotype, abstract, attributes[], operations[]; ERD entity: attributes[] like "PK id int"; see diagram_stencils)')
const DIAGRAM_SHAPE = z.object({
  ref: z.string().optional().describe('A name for this shape, usable as from/to of connectors in the same call'),
  stencil: z.string().describe('Stencil id such as flowchart.process, uml.class, erd.entity (diagram_stencils lists them)'),
  x: z.number().optional().describe('Left edge in page units (1/96 inch); leave x and y out to place it automatically'),
  y: z.number().optional(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  rotation: z.number().optional().describe('Degrees clockwise'),
  text: z.string().optional(),
  style: DIAGRAM_STYLE.optional(),
  data: DIAGRAM_DATA.optional()
})
const DIAGRAM_END = z.union([z.string(), z.object({ x: z.number(), y: z.number() })]).describe('A shape id, a ref from this call, or a free point {x, y}')
const DIAGRAM_CONNECTOR = z.object({
  ref: z.string().optional(),
  from: DIAGRAM_END,
  to: DIAGRAM_END,
  fromPort: z.string().optional().describe('A connection point: a stencil port (n, e, s, w, ...), an ERD attribute name, "y=<px>" on a lifeline, or "fx,fy" fractions; default: the best side, chosen dynamically'),
  toPort: z.string().optional(),
  y: z.number().optional().describe('Sequence diagrams: the page y of a message between two lifelines (sets both ports)'),
  preset: z.string().optional().describe('flow, line, arrow, double-arrow, curved, elbow, dashed, uml.association, uml.inheritance, uml.realization, uml.dependency, uml.aggregation, uml.composition, uml.message, uml.async-message, uml.return, uml.include, uml.extend, uml.transition, uml.note-link, erd.one-to-one, erd.one-to-many, erd.one-to-one-or-many, erd.zero-or-one, erd.many-to-many, erd.chen'),
  routing: z.enum(['orthogonal', 'straight', 'curved']).optional(),
  label: z.string().optional(),
  startLabel: z.string().optional().describe('Text near the start (a multiplicity such as 1 or 0..*)'),
  endLabel: z.string().optional(),
  style: DIAGRAM_STYLE.optional(),
  waypoints: z.array(z.object({ x: z.number(), y: z.number() })).max(50).optional()
})
const DIAGRAM_PAGE = z.union([z.number().int(), z.string()]).optional().describe('Page number (1 = first) or name; default: the page the window shows')
const DIAGRAM_LAYOUT = z.object({
  algorithm: z.enum(['layered', 'grid', 'circle']).optional().describe('layered (default): flows and trees along the connectors; grid; circle'),
  direction: z.enum(['TB', 'LR', 'BT', 'RL']).optional().describe('layered: TB top to bottom (default), LR left to right, ...'),
  spacing: z.number().min(0).max(1000).optional(),
  rankSpacing: z.number().min(0).max(1000).optional(),
  columns: z.number().int().min(1).max(100).optional(),
  ids: z.array(z.string()).optional().describe('Only these shapes; default: every shape that is not a container')
})

export interface ToolDefinition {
  group: ToolGroup
  description: string
  input: z.ZodObject
  /**
   * `read`: only reads; it never asks, also when the group is set to Ask (Deny still blocks it).
   * `confirm`: changes AgentXP itself; it always asks the user, also when the group is set to Allow.
   * Default: the group's policy decides.
   */
  access?: 'read' | 'confirm'
}

export const TOOL_DEFS = {
  desktop_state: {
    group: 'shell',
    description: 'The current desktop as JSON: drives, open windows (with what each shows), focus, enabled tool groups, permissions, pause and control flags.',
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
      'Open an app window for your output: it opens behind the user\'s window, without the focus, and its taskbar button flashes (an open window of a single-window app is reused where it is). ' +
      'Returns the window id. The tools of output apps that need a window become available once it is open (Browser: browser_*, Agent Paint: paint_*, Agent Diagrams: diagram_*); ' +
      'every other tool works without opening anything. Do not open an app just so the user can watch. Follows the Control Center policy "Agent may open apps".',
    input: z.object({
      app,
      path: z.string().optional().describe('explorer, notepad, code, wordpad, paint, diagrams: virtual path to show (E:\\src, relative to your working directory, ...); an Explorer without a path shows Computer (the drives)'),
      url: z.string().optional().describe('browser: address to load')
    })
  },
  review_open: {
    group: 'shell',
    description:
      'Open a Code Review window for a project folder behind the user\'s window (or reuse the open one for it) so you can review its uncommitted changes there. Follows "Agent may open apps". Call this first when you are asked for a code review and no Code Review window is open; then use review_list_changes, review_read_diff, review_add_comment and review_submit.',
    input: z.object({
      path: z.string().optional().describe('The project folder to review (E:\\, E:\\src, relative to your working directory); default: your working directory'),
      baseRef: z.string().optional().describe('The git ref to compare with; default HEAD (the working tree against the last commit)')
    })
  },
  desktop_close_app: {
    group: 'shell',
    description: 'Close an app window. The tools that need that window (browser_*, paint_*, diagram_*, review_*) disappear when no window of its app is left.',
    input: z.object({ window: z.number().int().optional().describe('Window id'), app: app.optional().describe('Closes the windows of this app when no window id is given') })
  },
  chats_list: {
    group: 'shell',
    description:
      'List the chats of this desktop, latest activity first (what Start > Recent chats shows): id, title, status, working directory, last activity, and whether a Chat window shows it. Closed chats keep their history and can be opened again with chat_open.',
    input: z.object({
      limit: z.number().int().min(1).max(100).optional().describe('Maximum chats (default 20)'),
      query: z.string().optional().describe('Only chats whose title contains this text (case-insensitive)')
    })
  },
  chat_read: {
    group: 'shell',
    description:
      'Read the transcript of a chat of this desktop as Markdown (the messages and tool calls the user sees). Long transcripts are cut at the start; pass maxChars for more.',
    input: z.object({
      chat: z.number().int().describe('Chat id from chats_list'),
      maxChars: z.number().int().min(500).max(200_000).optional().describe('Most characters to return, counted from the end (default 20000)')
    })
  },
  chat_open: {
    group: 'shell',
    description:
      'Open a chat of this desktop again in a Chat window with its whole history, behind the user\'s window (an open window is left where it is). Follows the Control Center policy "Agent may open apps".',
    input: z.object({ chat: z.number().int().describe('Chat id from chats_list') })
  },
  fs_list: {
    group: 'fs.read',
    description: 'List one directory: returns its entries, folders first, one virtual path per line (folders end with \\; .git and node_modules are hidden). Opens nothing.',
    input: z.object({ path: z.string().optional().describe('Directory as a virtual path or relative to your working directory; default: your working directory') })
  },
  fs_find: {
    group: 'fs.read',
    description:
      'Find files and folders below a directory by name, by a word or phrase in the file, or both (.git and node_modules are skipped). ' +
      'Case-insensitive; `*` in the name matches any characters. Returns the virtual paths found, one per line. Opens nothing.',
    input: z.object({
      pattern: z.string().optional().describe('All or part of the file name, or a glob: "*.test.ts", "*.{ts,svelte}", "src/**/*.ts" (a pattern with a slash matches the path below the folder searched)'),
      containing: z.string().optional().describe('A word or phrase in the file (plain text, not case-sensitive); only files that contain it are found'),
      path: z.string().optional().describe('Directory to search, as a virtual path or relative to your working directory; default: your working directory'),
      limit: z.number().int().min(1).max(500).optional().describe('Maximum results (default 100)')
    })
  },
  notepad_open: {
    group: 'notepad',
    description: 'Open a text file in a Notepad window for the user, behind the user\'s window (a Notepad that shows the file already is left where it is). Follows "Agent may open apps". To read a file use code_read.',
    input: z.object({ path: path('File') })
  },
  notepad_read: {
    group: 'notepad',
    description: 'Read the saved text of the file a Notepad window shows (or of `path`).',
    input: z.object({ path: z.string().optional().describe('File as a virtual path or relative to your working directory; default: the file of the focused Notepad') })
  },
  show: {
    group: 'show',
    description:
      'Show the user one thing, with a reason: a file at a line range, one of your recorded changes, a review comment, a Kanban card, a shape of the Agent Diagrams window, ' +
      'an element of the Browser page (a ref from browser_read or browser_find) or an app window. Use it only when you want the user to look, now, at that one thing; ' +
      'never to let the user watch you work. The note is required: say why in one short sentence ("Here the token is checked before it expires"), not "see this". ' +
      'If the user is in your chat, the target opens at the exact spot, your cursor points at it and your note shows beside it; if the user is elsewhere they get a ' +
      'request ("<your name> wants to show you ...") with Show and Not now, and one show waits while another is on screen. ' +
      'Returns whether it was shown now, queued, sent as a request, or not shown (the user declined, or "Agent may show you things" is Never). A target that is not there (no such file, comment, card or shape) is an error.',
    input: z.object({
      target: z
        .discriminatedUnion('kind', [
          z.object({ kind: z.literal('file'), path: path('File'), lines: z.tuple([z.number().int().min(1), z.number().int().min(1)]).optional().describe('First and last line to point at, e.g. [40, 62]') }),
          z.object({
            kind: z.literal('change'),
            path: z.string().optional().describe('The file of the recorded change (virtual path or relative to your working directory); default: your latest change'),
            changeId: z.number().int().optional().describe('A change id, when you know it')
          }),
          z.object({ kind: z.literal('review-comment'), id: z.number().int().describe('The comment id (review_add_comment returns it)') }),
          z.object({ kind: z.literal('card'), boardId: BOARD_REF, cardId: z.number().int().describe('The card id (board_get lists them)') }),
          z.object({ kind: z.literal('diagram-shape'), id: z.string().min(1).describe('A shape or connector id of the Agent Diagrams window (diagram_read lists them)') }),
          z.object({ kind: z.literal('page-element'), ref: z.number().int().describe('A ref from browser_read or browser_find on the current page') }),
          z.object({ kind: z.literal('window'), app: app.describe('The app whose window to bring forward') })
        ])
        .describe('The one thing to show'),
      note: z.string().trim().min(1).max(SHOW_NOTE_MAX).describe('Why the user should look, in one short sentence')
    })
  },
  code_read: {
    group: 'fs.read',
    description:
      'Read a text file, or a range of its lines: returns the lines with line numbers ("12\\tline text") and how many lines the file has. Opens nothing.',
    input: z.object({
      path: path('File'),
      startLine: z.number().int().min(1).optional().describe('First line to read (default 1)'),
      endLine: z.number().int().min(1).optional().describe('Last line to read (default: the end of the file, at most 2000 lines from startLine)')
    })
  },
  code_search: {
    group: 'fs.read',
    description:
      'Find in files: every line below a folder (or in one file) that contains the text or matches the regular expression, as "path:line:column: text". ' +
      'Returns a summary line and one line per match. .git and node_modules are skipped, and big or binary files too. Opens nothing.',
    input: z.object({
      query: z.string().min(1).describe('The text to find, or a JavaScript regular expression when regex is true'),
      path: z.string().optional().describe('Folder (or file) to search, as a virtual path or relative to your working directory; default: your working directory'),
      regex: z.boolean().optional().describe('Treat query as a regular expression (default false)'),
      matchCase: z.boolean().optional().describe('Match upper and lower case exactly (default false)'),
      include: z.string().optional().describe('Only files that match one of these comma-separated names or globs, such as "*.ts, *.svelte", "*.{ts,tsx}" or "src/**/*.ts" (a pattern with a slash matches the path below the folder searched)'),
      limit: z.number().int().min(1).max(1000).optional().describe('Maximum matching lines (default 200)')
    })
  },
  code_edit: {
    group: 'fs.write',
    description:
      'Edit a text file in the Code app: replace oldText with newText. oldText must match the file exactly (spaces and line breaks too) and only once, ' +
      'unless replaceAll is true. Returns the lines changed. The change is recorded in the Changes pane (the user can review and revert it); ' +
      'a Code window that shows the file already reloads it. Opens nothing. Read the file first (code_read).',
    input: z.object({
      path: path('File'),
      oldText: z.string().min(1).describe('The exact text to replace'),
      newText: z.string().describe('The text to put in its place (empty deletes oldText)'),
      replaceAll: z.boolean().optional().describe('Replace every occurrence of oldText (default false: it must occur once)')
    })
  },
  code_write: {
    group: 'fs.write',
    description:
      'Create a text file, or replace all of its text. Returns whether it was created or replaced and its line count. The change is recorded in the Changes pane ' +
      '(the user can review and revert it). Opens nothing. For a small change to an existing file use code_edit.',
    input: z.object({
      path: path('File'),
      text: z.string().describe('The whole new text of the file')
    })
  },
  terminal_run: {
    group: 'terminal',
    description:
      'Run a shell command and wait for it (it runs in a real folder behind a drive; ejected drives are refused). Returns the output (last 20k characters) and the exit code. ' +
      'The run is recorded for the Terminal app (an open Terminal shows it live). Opens nothing. Never use a shell sub-agent instead.',
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
      'Load a web page (http or https) in the open Browser window and wait until it has loaded; returns the title and address. The Browser stays where it is and does not take the focus. Using a web app (chat, mail, docs): navigate once, then loop browser_read (mode tree) -> browser_find -> browser_click / browser_type / browser_press -> browser_wait -> browser_read. The user signs in themselves in the window (the session is kept); never type passwords.',
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
    description: 'Put a markdown file in a WordPad window for the user: an open WordPad is used where it is, otherwise one opens behind the user\'s window (follows "Agent may open apps").',
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
  diagram_new: {
    group: 'diagrams',
    description: 'Start a new, empty diagram in the Agent Diagrams window. The drawing it replaces stays in Undo; save it first when it matters.',
    input: z.object({
      title: z.string().optional(),
      pageSize: z.enum(['letter-landscape', 'letter-portrait', 'a4-landscape', 'a4-portrait', 'a3-landscape', 'screen']).optional(),
      pageName: z.string().optional(),
      windowId: windowIdParam
    })
  },
  diagram_stencils: {
    group: 'diagrams',
    description:
      'List the stencils (shape types) you can add, by category: basic, flowchart, uml-class, uml-sequence, uml-usecase, uml-activity, uml-state, erd, containers, orgchart, network. Also lists the connector presets and line ends. Call it once before drawing a kind of diagram you have not drawn yet.',
    input: z.object({
      category: z.string().optional(),
      query: z.string().optional().describe('Search words, such as "database" or "decision"'),
      detail: z.boolean().optional().describe('Also list the connection points of each stencil'),
      windowId: windowIdParam
    })
  },
  diagram_add: {
    group: 'diagrams',
    description:
      'Add shapes and connectors to the diagram in one call. Give each new shape a ref and connect refs (or existing ids). Connectors glue to the shapes and re-route when shapes move. Leave out x/y and pass layout to arrange everything automatically. Returns the new ids.',
    input: z.object({
      shapes: z.array(DIAGRAM_SHAPE).max(300).optional(),
      connectors: z.array(DIAGRAM_CONNECTOR).max(600).optional(),
      layout: DIAGRAM_LAYOUT.optional().describe('Run an automatic layout after adding'),
      page: DIAGRAM_PAGE,
      windowId: windowIdParam
    })
  },
  diagram_update: {
    group: 'diagrams',
    description: 'Change shapes (position, size, rotation, text, style, data, stencil, locked) and connectors (ends, ports, preset, routing, labels, style) by id.',
    input: z.object({
      shapes: z.array(DIAGRAM_SHAPE.partial().extend({ id: z.string(), locked: z.boolean().optional() })).max(300).optional(),
      connectors: z.array(DIAGRAM_CONNECTOR.partial().extend({ id: z.string() })).max(600).optional(),
      page: DIAGRAM_PAGE,
      windowId: windowIdParam
    })
  },
  diagram_delete: {
    group: 'diagrams',
    description: 'Delete shapes and connectors by id. Deleting a shape also deletes the connectors glued to it.',
    input: z.object({ ids: z.array(z.string()).min(1), page: DIAGRAM_PAGE, windowId: windowIdParam })
  },
  diagram_layout: {
    group: 'diagrams',
    description: 'Arrange the shapes of a page automatically: layered (flowcharts, trees, class and ER diagrams), grid or circle. Connectors re-route.',
    input: DIAGRAM_LAYOUT.extend({ page: DIAGRAM_PAGE, windowId: windowIdParam })
  },
  diagram_arrange: {
    group: 'diagrams',
    description: 'Align, distribute, order or group shapes.',
    input: z.object({
      ids: z.array(z.string()).min(1),
      action: z.enum(['align-left', 'align-center', 'align-right', 'align-top', 'align-middle', 'align-bottom', 'distribute-horizontal', 'distribute-vertical', 'front', 'back', 'forward', 'backward', 'group', 'ungroup']),
      page: DIAGRAM_PAGE,
      windowId: windowIdParam
    })
  },
  diagram_pages: {
    group: 'diagrams',
    description: 'List, show (select), add, rename, delete or duplicate the pages of the diagram.',
    input: z.object({ action: z.enum(['list', 'select', 'add', 'rename', 'delete', 'duplicate']), page: DIAGRAM_PAGE, name: z.string().optional(), windowId: windowIdParam })
  },
  diagram_select: {
    group: 'diagrams',
    description: 'Select shapes and connectors in the window, to point the user at them (an empty list clears the selection).',
    input: z.object({ ids: z.array(z.string()), page: DIAGRAM_PAGE, windowId: windowIdParam })
  },
  diagram_read: {
    group: 'diagrams',
    description: 'Read the diagram: an outline of a page (every shape with id, stencil, position, size and text; every connector with its ends), or the full JSON.',
    input: z.object({ page: DIAGRAM_PAGE, format: z.enum(['outline', 'json']).optional(), allPages: z.boolean().optional().describe('json: the whole document'), windowId: windowIdParam })
  },
  diagram_export: {
    group: 'diagrams',
    description:
      'Export a page. png returns a picture of it, so you can look at your diagram; svg and json return the text, or with path write the file (recorded as one of your file changes).',
    input: z.object({
      format: z.enum(['png', 'svg', 'json']).default('png'),
      path: path('File to write (svg or json)').optional(),
      page: DIAGRAM_PAGE,
      area: z.enum(['content', 'page']).optional().describe('content (default): the drawing with a margin; page: the whole sheet'),
      windowId: windowIdParam
    })
  },
  diagram_save: {
    group: 'diagrams',
    description: 'Save the diagram as an .xpdiagram file (default: the file it was opened from). The write is recorded as one of your file changes.',
    input: z.object({ path: path('File').optional(), windowId: windowIdParam })
  },
  diagram_open: {
    group: 'diagrams',
    description: 'Open an .xpdiagram file in the Agent Diagrams window.',
    input: z.object({ path: path('File'), windowId: windowIdParam })
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
  board_list: {
    group: 'board',
    description:
      'List the Kanban boards of this desktop (id, name, columns with card counts). Boards are how agents and people track work: a team shares one board, cards have a title, a description and an assignee.',
    input: z.object({})
  },
  board_get: {
    group: 'board',
    description: 'Show one board: its columns and every card with ids, title, assignee and description. Default: the only board, when there is just one.',
    input: z.object({ board: BOARD_REF.optional() })
  },
  board_create: {
    group: 'board',
    description: 'Create a board. It gets the columns "To do", "Doing" and "Done" unless you pass `columns`.',
    input: z.object({ name: z.string().min(1), columns: z.array(z.string().min(1)).optional() })
  },
  board_rename: {
    group: 'board',
    description: 'Rename a board.',
    input: z.object({ board: BOARD_REF, name: z.string().min(1) })
  },
  board_delete: {
    group: 'board',
    description: 'Delete a board with all its columns and cards.',
    input: z.object({ board: BOARD_REF })
  },
  board_add_column: {
    group: 'board',
    description: 'Add a column (list) at the right end of a board.',
    input: z.object({ board: BOARD_REF, name: z.string().min(1) })
  },
  board_rename_column: {
    group: 'board',
    description: 'Rename a column.',
    input: z.object({ column: z.number().int().describe('Column id from board_get'), name: z.string().min(1) })
  },
  board_delete_column: {
    group: 'board',
    description: 'Delete a column with its cards.',
    input: z.object({ column: z.number().int().describe('Column id from board_get') })
  },
  board_add_card: {
    group: 'board',
    description: 'Add a card at the bottom of a column. Assign it to a person or an agent profile by name.',
    input: z.object({
      column: z.union([z.number().int(), z.string()]).describe('Column id, or its name (then pass `board` too unless there is a single board)'),
      board: BOARD_REF.optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      assignee: z.string().optional()
    })
  },
  board_update_card: {
    group: 'board',
    description: 'Change a card\'s title, description or assignee. An empty assignee clears it.',
    input: z.object({ card: z.number().int().describe('Card id from board_get'), title: z.string().min(1).optional(), description: z.string().optional(), assignee: z.string().optional() })
  },
  board_move_card: {
    group: 'board',
    description: 'Move a card to a column of its board (for example to "Doing" or "Done"), optionally to a position (0 is the top). Default: the bottom.',
    input: z.object({
      card: z.number().int().describe('Card id from board_get'),
      column: z.union([z.number().int(), z.string()]).describe('Column id, or its name on the card\'s board'),
      position: z.number().int().min(0).optional()
    })
  },
  board_delete_card: {
    group: 'board',
    description: 'Delete a card.',
    input: z.object({ card: z.number().int().describe('Card id from board_get') })
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
    description: 'List the changed files of the review (status, added and removed lines, open comments) against the review\'s base ref. Works in the Code Review window of your project (call review_open first when none is open).',
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
  },
  ...ADMIN_TOOL_DEFS
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
