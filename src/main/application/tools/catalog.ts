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
const path = (what: string) => z.string().min(1).describe(`${what}, relative to the workspace folder (W:)`)

export interface ToolDefinition {
  group: ToolGroup
  description: string
  input: z.ZodObject
}

export const TOOL_DEFS = {
  desktop_state: {
    group: 'shell',
    description: 'The current desktop as JSON: open windows (with what each shows), focus, enabled tool groups, pause and control flags.',
    input: z.object({})
  },
  desktop_open_app: {
    group: 'shell',
    description:
      'Open an app window on the desktop. Opening an app enables its tools (Terminal: terminal_*, Browser: browser_*, Notepad: notepad_*, Code: code_*, Explorer: fs_*).',
    input: z.object({
      app,
      path: z.string().optional().describe('explorer, notepad, code: workspace-relative path to show'),
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
    description: 'List one directory of the workspace (folders first). Needs the Explorer or Code app.',
    input: z.object({ path: z.string().optional().describe('Workspace-relative directory; default: the workspace root') })
  },
  fs_find: {
    group: 'fs.read',
    description: 'Find files and folders by name below a directory. Case-insensitive; `*` matches any characters. Needs the Explorer or Code app.',
    input: z.object({
      pattern: z.string().min(1).describe('Name or glob such as "*.test.ts" or "readme"'),
      path: z.string().optional().describe('Workspace-relative directory to search; default: the root'),
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
    input: z.object({ path: z.string().optional().describe('Workspace-relative file; default: the file of the focused Notepad') })
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
    description: 'Run a shell command in the workspace and wait for it. Output appears in the Terminal app and is returned (last 20k characters).',
    input: z.object({
      command: z.string().min(1),
      cwd: z.string().optional().describe('Workspace-relative working directory; default: the workspace root'),
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
