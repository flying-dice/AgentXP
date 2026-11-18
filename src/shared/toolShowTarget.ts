/**
 * Where a step of the agent can be seen: the **Show in...** actions of a chat tool row and of the activity feed
 * (`docs/AGENT_PRESENCE.md`, "Work: quiet, never hidden"). Work tools open nothing; the operator opens the place in one
 * click from the row. Pure: derived from the AG-UI tool call (its kind, locations, contents and raw input, and the
 * `code_*`, `terminal_run` and `browser_*` tool names of the agentxp MCP server).
 */
import type { ToolCallContentDto, ToolCallLocationDto, ToolKind } from './models'
import { joinVPath, normaliseVPath, type VPath } from './vfs'
import { parseShowTarget, showLabelOf, showOutcomeOf, showRowTitle, showTargetLabel, type ShowTarget } from './show'

export type ToolShowTarget =
  /** Code at a file, with the lines to highlight when they are known. */
  | { kind: 'code'; path: VPath; lines: [number, number] | null }
  /** Code on the recorded change of a file (its Changes list). */
  | { kind: 'diff'; path: VPath }
  /** The Terminal on the run: the terminal of an ACP call, else the command of a `terminal_run`. */
  | { kind: 'terminal'; terminalId: string | null; command: string | null }
  /** The Browser window the step drove (`window` of the call, else the front-most Browser). */
  | { kind: 'browser'; windowId: number | null; url: string | null }
  /** **Show again** of a `show` row: the agent's target and note, opened at the spot for the operator. */
  | { kind: 'again'; target: ShowTarget; note: string }

export interface ToolShowInput {
  /** The title the agent gave the call (`agentxp.code_read`, `mcp__agentxp__code_read`, `Read src/a.ts`...). */
  title: string
  kind?: ToolKind | null
  rawInput: string | null
  locations?: readonly ToolCallLocationDto[]
  contents?: readonly ToolCallContentDto[]
  /** The text result of the call (the first match of a `code_search` is shown). */
  result?: string | null
  /** The chat's working directory: relative paths of the agent's input are relative to it. */
  cwd?: VPath | null
}

/** The label of each action; one word for what opens. */
export const SHOW_LABELS: Record<ToolShowTarget['kind'], string> = {
  code: 'Show in Code',
  diff: 'Show diff',
  terminal: 'Show in Terminal',
  browser: 'Show in Browser',
  again: 'Show again'
}

type Input = Record<string, unknown>

function parse(json: string | null | undefined): Input {
  if (!json) return {}
  try {
    const value: unknown = JSON.parse(json)
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Input) : {}
  } catch {
    return {}
  }
}

/** The agentxp tool a title names: `agentxp.code_read`, `mcp__agentxp__code_read` and `code_read {...}` all give `code_read`. */
export function agentxpToolName(title: string): string | null {
  const head = title.trim().split(/\s/)[0] ?? ''
  const name = head.replace(/^mcp__.*?__/, '').replace(/^[a-z0-9_-]+\./i, '')
  if (name === 'show' && head !== 'show') return name // `agentxp.show`, `mcp__agentxp__show` (a bare "show" may be another server's)
  return /^(code|terminal|browser|fs|notepad|wordpad|review)_[a-z_]+$/.test(name) ? name : null
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null)
const int = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null)

/** A VPath for a path of the agent's input: a full VPath, or relative to the chat's cwd. Null when it is neither (a host path). */
export function toVPath(path: string, cwd?: VPath | null): VPath | null {
  const full = normaliseVPath(path)
  if (full && /^[A-Za-z]:/.test(path.trim())) return full
  if (!cwd || /^([\\/]|[A-Za-z]:)/.test(path.trim())) return null
  return joinVPath(cwd, ...path.split(/[\\/]+/).filter(Boolean))
}

/** The first `E:\src\a.ts:12:` match line of a code_search result. */
function firstMatch(result: string | null | undefined): { path: VPath; line: number } | null {
  const hit = /^([A-Za-z]:\\[^\n:]*):(\d+):\d+:/m.exec(result ?? '')
  return hit ? { path: hit[1]!, line: Number(hit[2]) } : null
}

/**
 * The row of a `show` call (Show, `docs/AGENT_PRESENCE.md` section 5): "Showed you auth.ts:40-62: <note>",
 * "Asked to show you ...", "Not shown (Never): ...", and whether **Show again** fits (not after Never or a decline).
 * Null for any other tool.
 */
export function showRowOf(call: ToolShowInput): { title: string; again: boolean } | null {
  if (agentxpToolName(call.title) !== 'show') return null
  const titled = /^[\w.-]+\s+(\{[\s\S]*\})\s*$/.exec(call.title.trim())?.[1]
  const input: Input = { ...parse(titled), ...parse(call.rawInput) }
  const target = parseShowTarget(input['target'])
  const note = text(input['note']) ?? ''
  const outcome = showOutcomeOf(call.result)
  const label = showLabelOf(call.result) ?? (target ? showTargetLabel(target) : 'something')
  return { title: showRowTitle(outcome, label, note), again: target !== null && outcome !== 'never' && outcome !== 'declined' }
}

/**
 * The places a step can be shown, the main one first (the activity feed opens that one). Empty when there is nothing to
 * show (a search with no match, a path outside the drives, a tool with no place).
 */
export function toolShowTargets(call: ToolShowInput): ToolShowTarget[] {
  // An MCP call's input may only be in its title (`terminal_run {"command":"npm test"}`).
  const titled = /^[\w.-]+\s+(\{[\s\S]*\})\s*$/.exec(call.title.trim())?.[1]
  const input: Input = { ...parse(titled), ...parse(call.rawInput) }
  const tool = agentxpToolName(call.title)
  const path = text(input['path']) ? toVPath(String(input['path']), call.cwd) : null
  switch (tool) {
    case 'show': {
      const target = parseShowTarget(input['target'])
      return target ? [{ kind: 'again', target, note: text(input['note']) ?? '' }] : []
    }
    case 'code_read': {
      if (!path) return []
      const start = int(input['startLine']) ?? int(input['line'])
      const end = int(input['endLine']) ?? start
      return [{ kind: 'code', path, lines: start === null ? null : [start, Math.max(start, end ?? start)] }]
    }
    case 'code_edit':
    case 'code_write':
      return path ? [{ kind: 'code', path, lines: null }, { kind: 'diff', path }] : []
    case 'code_search': {
      const match = firstMatch(call.result)
      return match ? [{ kind: 'code', path: match.path, lines: [match.line, match.line] }] : []
    }
    case 'terminal_run':
      return [{ kind: 'terminal', terminalId: null, command: text(input['command']) }]
    default:
      if (tool?.startsWith('browser_')) return [{ kind: 'browser', windowId: int(input['window']), url: tool === 'browser_navigate' ? text(input['url']) : null }]
      if (tool) return []
  }
  // The agent's own tools: an ACP terminal, or a file location / diff the client mapped to a VPath.
  const terminal = call.contents?.find((c) => c.kind === 'terminal')
  if (terminal?.kind === 'terminal') return [{ kind: 'terminal', terminalId: terminal.terminalId, command: null }]
  if (call.kind === 'execute') return [{ kind: 'terminal', terminalId: null, command: text(input['command']) }]
  if (call.kind !== 'read' && call.kind !== 'edit' && call.kind !== 'search') return []
  const diff = call.contents?.find((c) => c.kind === 'diff')
  const located = call.locations?.[0]
  const file = (located ? toVPath(located.path) : null) ?? (diff?.kind === 'diff' ? toVPath(diff.path) : null)
  if (!file) return []
  const line = located?.line ?? null
  const targets: ToolShowTarget[] = [{ kind: 'code', path: file, lines: line ? [line, line] : null }]
  if (call.kind === 'edit') targets.push({ kind: 'diff', path: file })
  return targets
}
