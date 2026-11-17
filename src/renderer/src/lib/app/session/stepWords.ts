/**
 * The step an agent is on, in a few plain words for the team room member rows and the top-bar agents popup
 * (`docs/AGENT_PRESENCE.md`, section 4): "reading auth.ts", "editing auth.ts", "running npm test". Built from the same
 * tool names as the **Show in...** places (`toolShowTargets`) and the plain titles (`plainToolTitle`, `browserNow`).
 */
import type { AguiToolCallState } from '@shared/agui-state'
import type { ToolCallContentDto, ToolCallLocationDto, ToolKind, ToolCallStatus } from '@shared/models'
import { baseName } from '@shared/notices'
import { agentxpToolName } from '@shared/toolShowTarget'
import { browserNow } from './browserSteps'
import { plainToolTitle } from './toolTitles'

export interface StepInput {
  title: string
  kind?: ToolKind | null
  rawInput: string | null
  locations?: readonly ToolCallLocationDto[]
  contents?: readonly ToolCallContentDto[]
}

/** The longest command or query a step names before it is cut ("running npm run test:e2e -- e2e/fo..."). */
const MAX = 40

const clip = (text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length <= MAX ? line : `${line.slice(0, MAX - 3)}...`
}

const lowerFirst = (text: string): string => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text)

function inputOf(call: StepInput): Record<string, unknown> {
  const titled = /^[\w.-]+\s+(\{[\s\S]*\})\s*$/.exec(call.title.trim())?.[1]
  const parse = (json: string | null | undefined): Record<string, unknown> => {
    if (!json) return {}
    try {
      const value: unknown = JSON.parse(json)
      return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return { ...parse(titled), ...parse(call.rawInput) }
}

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)

/** "reading auth.ts", "running npm test", "clicking 'Save'"; null when the step has no words (an empty title). */
export function stepWords(call: StepInput): string | null {
  const input = inputOf(call)
  const tool = agentxpToolName(call.title)
  const file = str(input['path']) ? baseName(String(input['path'])) : null
  switch (tool) {
    case 'code_read':
    case 'notepad_read':
    case 'wordpad_read':
      return file ? `reading ${file}` : 'reading a file'
    case 'code_edit':
      return file ? `editing ${file}` : 'editing a file'
    case 'code_write':
    case 'wordpad_write':
      return file ? `writing ${file}` : 'writing a file'
    case 'code_search':
      return str(input['query']) ? `searching for "${clip(String(input['query']))}"` : 'searching the files'
    case 'fs_find':
      return str(input['query']) ? `finding "${clip(String(input['query']))}"` : 'finding files'
    case 'fs_list':
      return file ? `listing ${file}` : 'listing a folder'
    case 'terminal_run':
      return str(input['command']) ? `running ${clip(String(input['command']))}` : 'running a command'
    case 'show':
      return 'showing you something'
    default:
      break
  }
  if (tool) {
    const browser = browserNow(call.title, call.rawInput)
    if (browser) return lowerFirst(browser)
    const plain = plainToolTitle(call.title)
    return plain ? lowerFirst(plain) : null
  }
  // The agent's own tools: the kind and the file it named.
  const located = call.locations?.[0]?.path ?? call.contents?.find((c) => c.kind === 'diff')?.path ?? null
  const named = located ? baseName(located) : file
  switch (call.kind) {
    case 'read':
      return named ? `reading ${named}` : 'reading a file'
    case 'edit':
      return named ? `editing ${named}` : 'editing a file'
    case 'delete':
      return named ? `deleting ${named}` : 'deleting a file'
    case 'move':
      return named ? `moving ${named}` : 'moving a file'
    case 'search':
      return 'searching the files'
    case 'execute':
      return str(input['command']) ? `running ${clip(String(input['command']))}` : 'running a command'
    case 'fetch':
      return 'reading a web page'
    default: {
      const plain = plainToolTitle(call.title)
      if (plain) return lowerFirst(plain)
      const title = call.title.trim()
      return title && !/[{[]\s*"/.test(title) ? lowerFirst(clip(title)) : null
    }
  }
}

const RUNNING: readonly ToolCallStatus[] = ['pending', 'in_progress']

/** The step a chat is on now: its newest running tool call in words, else null (it is thinking or idle). */
export function currentStep(toolCalls: Record<string, AguiToolCallState>): string | null {
  const calls = Object.values(toolCalls)
  for (let i = calls.length - 1; i >= 0; i--) if (RUNNING.includes(calls[i].status)) return stepWords(calls[i])
  return null
}
