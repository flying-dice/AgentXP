/**
 * Plain-words titles for permission requests: "change src/auth/redirect.ts", "run a command", "read the page".
 * An agent names a tool call in its own words ("Edit src/a.ts", "Run npm test", `browser_navigate {"url": ...}`).
 * The approval dialogs and the Action Center show these instead, so no tool name or JSON reaches the person.
 */
import type { ToolKind } from '@shared/models'

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
