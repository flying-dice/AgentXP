/**
 * Plain-words titles for permission requests: "change src/auth/redirect.ts", "run a command", "read the page".
 * An agent names a tool call in its own words ("Edit src/a.ts", "Run npm test", `browser_navigate {"url": ...}`).
 * The approval dialogs and the Action Center show these instead, so no tool name or JSON reaches the person.
 *
 * Plain titles for the agent's tools. An agent names its tools like a program does (`fs.read_text_file`,
 * `agent7.browser_read`); the person sees what the tool does ("Read a file", "Read the page"). Unknown names have no
 * plain title: callers keep what the agent said.
 */
import type { ToolKind } from '@shared/models'
import { browserNow } from './browserSteps'

export interface ToolTitleInput {
  /** The title the agent gave the tool call. */
  title: string
  toolKind: ToolKind | null
  /** The file the call works on, when it is known (a diff path or a location). */
  path?: string | null
}

/** `read_file` or `mcp__x__y`, or text with JSON in it: a tool name, not a sentence. A file name such as `a_b.ts` is not. */
const looksLikeToolName = (title: string): boolean => /^[a-z][a-z0-9]*(?:_+[a-z0-9]+)+(?:\s|$)/.test(title) || /[{[]\s*"/.test(title)

/** The words after the verb of a title ("Edit src/a.ts" gives "src/a.ts"), or '' when there is only a verb. */
const afterVerb = (title: string): string => title.trim().replace(/^\S+\s*/, '')

const lowerFirst = (text: string): string => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text)

/** What the agent wants to do, as a verb phrase for "Allow the agent to ...?" (`change src/a.ts`, `run a command`). */
export function toolPredicate({ title, toolKind, path }: ToolTitleInput): string {
  // The agent's own wording of the file is the shortest ("src/a.ts"); the full path is the fallback ("Write file").
  const named = afterVerb(title)
  const target = /[\\/.]/.test(named) ? named : (path ?? '').trim()
  const sentence = title.trim() && !looksLikeToolName(title.trim()) ? lowerFirst(title.trim()) : ''
  // Without a file the agent's own words ("Write output") are the next best thing, then a generic phrase.
  const withTarget = (verb: string, fallback: string): string => (target && !looksLikeToolName(target) ? `${verb} ${target}` : sentence || fallback)
  switch (toolKind) {
    case 'edit':
      return withTarget('change', 'change a file')
    case 'delete':
      return withTarget('delete', 'delete a file')
    case 'move':
      return withTarget('move', 'move a file')
    case 'read':
      return withTarget('read', 'read a file')
    case 'search':
      return 'search the files'
    case 'execute':
      return 'run a command'
    case 'fetch':
      return 'read the page'
    case 'switch_mode':
      return 'switch to another mode'
    default: {
      const text = title.trim()
      return !text || looksLikeToolName(text) ? 'do something' : lowerFirst(text)
    }
  }
}

/** The question of an approval: "Allow the agent to change src/auth/redirect.ts?". `who` is "the agent" or its name. */
export const approvalTitle = (input: ToolTitleInput, who = 'the agent'): string => `Allow ${who} to ${toolPredicate(input)}?`

/** A short label of the request for lists: "Change src/auth/redirect.ts", "Run a command". */
export function toolLabel(input: ToolTitleInput): string {
  const predicate = toolPredicate(input)
  return predicate[0].toUpperCase() + predicate.slice(1)
}


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

/**
 * The title of a step that is running, for the status text and the chat row: the present-tense sentence of a Browser step
 * ("Typing 'Standup'"), else the plain title, else null. A tool id such as `agent7.browser_type` is never the answer (UX-170).
 */
export const liveToolTitle = (name: string, rawInput: string | null = null): string | null => browserNow(name, rawInput) ?? plainToolTitle(name)
