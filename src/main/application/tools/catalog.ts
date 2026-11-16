/**
 * The agent-facing desktop tools: name, group, description and input schema.
 * Pure (zod only): the MCP child process imports it to list the tools; the handlers live in
 * `<group>Tools.ts` and are only in the main process.
 */
import { z } from 'zod'
import { AGENT_OPENABLE_APPS, type ToolGroup } from '@shared/desktop'
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
  'Relative paths are relative to your working directory. Tools follow the apps that are open: call desktop_open_app to get more.'

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
    description: 'Load a web page (http or https) in a Browser window and wait until it has loaded.',
    input: z.object({ url: z.string().min(1), window: windowId })
  },
  browser_read: {
    group: 'browser',
    description: 'Read the page: title, address, visible text and a numbered list of links, buttons and inputs. Use the numbers as `ref` in browser_click and browser_type.',
    input: z.object({ window: windowId })
  },
  browser_screenshot: {
    group: 'browser',
    description: 'Take a PNG screenshot of the page as it is shown.',
    input: z.object({ window: windowId })
  },
  browser_click: {
    group: 'browser',
    description: 'Click the element numbered `ref` in the last browser_read.',
    input: z.object({ ref: z.number().int().min(1), window: windowId })
  },
  browser_type: {
    group: 'browser',
    description: 'Type into the input numbered `ref` in the last browser_read, replacing its value; optionally press Enter.',
    input: z.object({ ref: z.number().int().min(1), text: z.string(), submit: z.boolean().optional(), window: windowId })
  },
  browser_back: {
    group: 'browser',
    description: 'Go back one page in the Browser window.',
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
