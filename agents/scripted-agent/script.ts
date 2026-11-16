/**
 * The script format of the scripted agent (types) and its hand-rolled validator.
 * `script.schema.json` mirrors this file for editor completion; keep them in sync.
 *
 * Plain TypeScript only (type-only imports, no enums, no parameter properties): the file runs under
 * `node --experimental-strip-types`.
 */
import { readFileSync } from 'node:fs'

export type StepMode = 'auto' | 'manual'
export type StopReason = 'end_turn' | 'max_tokens' | 'max_turn_requests' | 'refusal' | 'cancelled'
export type ToolKind = 'read' | 'edit' | 'delete' | 'move' | 'search' | 'execute' | 'think' | 'fetch' | 'switch_mode' | 'other'
export type ToolStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type PermissionKind = 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always'

export interface PlanEntry {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
}
export type ToolContent = { text: string } | { diff: { path: string; oldText?: string; newText: string } }
export interface ToolLocation {
  path: string
  line?: number
}
export interface PermissionOptionSpec {
  optionId: string
  name: string
  kind: PermissionKind
}
export interface CommandSpec {
  name: string
  description: string
  hint?: string
}

export interface StepCommon {
  /** Overrides `defaults.stepMode` for this step. */
  step?: StepMode
  /** Sleep before the step runs (after a manual pause was released). */
  delayMs?: number
  label?: string
}
export type Chunked = boolean | number

export type Step = StepCommon &
  (
    | { type: 'message'; text: string; chunked?: Chunked }
    | { type: 'thought'; text: string; chunked?: Chunked }
    | { type: 'plan'; entries: PlanEntry[] }
    | { type: 'toolCall'; id: string; title: string; kind?: ToolKind; status?: ToolStatus; rawInput?: unknown; locations?: ToolLocation[]; content?: ToolContent[] }
    | { type: 'toolCallUpdate'; id: string; status?: ToolStatus; title?: string; content?: ToolContent[]; rawOutput?: unknown }
    | { type: 'requestPermission'; toolCallId: string; title?: string; options: PermissionOptionSpec[]; branches?: Record<string, Step[]> }
    | { type: 'readFile'; path: string; line?: number; limit?: number; saveAs?: string }
    | { type: 'writeFile'; path: string; content: string }
    | { type: 'terminal'; command: string; args?: string[]; cwd?: string; waitForExit?: boolean; saveAs?: string }
    | { type: 'mcpCall'; server: string; tool: string; arguments?: Record<string, unknown>; saveAs?: string; report?: boolean; id?: string }
    | { type: 'modeChange'; modeId: string }
    | { type: 'usage'; used: number; size: number }
    | { type: 'availableCommands'; commands: CommandSpec[] }
    | { type: 'sessionInfo'; title: string }
    | { type: 'wait'; ms: number }
    | { type: 'extract'; from: string; regex: string; saveAs: string; flags?: string }
    | { type: 'expect'; from: string; contains?: string; equals?: string; regex?: string; message?: string }
    | { type: 'error'; message: string; code?: number }
    | { type: 'end'; stopReason: StopReason }
  )
export type StepType = Step['type']

export type Match =
  | { any: true }
  | { equals: string; ignoreCase?: boolean }
  | { contains: string; ignoreCase?: boolean }
  | { regex: string; ignoreCase?: boolean }

export interface Rule {
  id: string
  match: Match
  /** The rule fires once, then is skipped. */
  once?: boolean
  steps: Step[]
}

export interface Script {
  $schema?: string
  name: string
  description?: string
  agent: {
    name: string
    version: string
    modes?: Array<{ id: string; name: string; description?: string }>
    models?: Array<{ id: string; name: string; description?: string }>
    commands?: CommandSpec[]
  }
  defaults?: {
    stepMode?: StepMode
    delayMs?: number
    /** Split messages and thoughts into chunks of this many characters. */
    chunkSize?: number
    /** Sleep between chunks. */
    chunkDelayMs?: number
    /** Send a thought chunk "[paused before ...]" whenever the runner waits for `next`. */
    announcePause?: boolean
  }
  rules: Rule[]
  fallback?: Step[]
}

export const STEP_TYPES: readonly StepType[] = [
  'message', 'thought', 'plan', 'toolCall', 'toolCallUpdate', 'requestPermission', 'readFile', 'writeFile', 'terminal',
  'mcpCall', 'modeChange', 'usage', 'availableCommands', 'sessionInfo', 'wait', 'extract', 'expect', 'error', 'end'
]
const STOP_REASONS: readonly StopReason[] = ['end_turn', 'max_tokens', 'max_turn_requests', 'refusal', 'cancelled']
const TOOL_KINDS: readonly ToolKind[] = ['read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'switch_mode', 'other']
const TOOL_STATUSES: readonly ToolStatus[] = ['pending', 'in_progress', 'completed', 'failed']
const PERMISSION_KINDS: readonly PermissionKind[] = ['allow_once', 'allow_always', 'reject_once', 'reject_always']

/** Thrown for every problem in a script; the message starts with the JSON path of the offending value. */
export class ScriptError extends Error {
  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`)
    this.name = 'ScriptError'
  }
}

const fail = (path: string, reason: string): never => {
  throw new ScriptError(path, reason)
}

type Kind = 'string' | 'number' | 'nonneg' | 'int' | 'boolean' | 'array' | 'object' | 'any' | readonly string[] | ((value: unknown, path: string) => void)
/** Field name -> kind; a trailing `!` on the name marks it required. */
type Spec = Record<string, Kind>

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function checkKind(value: unknown, kind: Kind, path: string): void {
  if (typeof kind === 'function') return kind(value, path)
  if (Array.isArray(kind)) {
    if (!kind.includes(value as string)) fail(path, `expected one of ${kind.map((k) => JSON.stringify(k)).join(', ')}`)
    return
  }
  switch (kind) {
    case 'string':
      if (typeof value !== 'string') fail(path, 'expected a string')
      return
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a number')
      return
    case 'nonneg':
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(path, 'expected a number >= 0')
      return
    case 'int':
      if (!Number.isInteger(value)) fail(path, 'expected an integer')
      return
    case 'boolean':
      if (typeof value !== 'boolean') fail(path, 'expected true or false')
      return
    case 'array':
      if (!Array.isArray(value)) fail(path, 'expected an array')
      return
    case 'object':
      if (!isObject(value)) fail(path, 'expected an object')
      return
    default:
      return
  }
}

/** Checks `value` is an object with exactly the fields of `spec` (unknown fields are typos and rejected). */
function checkObject(value: unknown, path: string, spec: Spec, extra: readonly string[] = []): Record<string, unknown> {
  if (!isObject(value)) return fail(path, 'expected an object')
  const known = new Set<string>(extra)
  for (const [rawKey, kind] of Object.entries(spec)) {
    const required = rawKey.endsWith('!')
    const key = required ? rawKey.slice(0, -1) : rawKey
    known.add(key)
    if (value[key] === undefined) {
      if (required) fail(`${path}.${key}`, 'is required')
    } else checkKind(value[key], kind, `${path}.${key}`)
  }
  for (const key of Object.keys(value)) if (!known.has(key)) fail(`${path}.${key}`, 'unknown field')
  return value
}

const each = (check: (item: unknown, path: string) => void): Kind => (value, path) => {
  if (!Array.isArray(value)) return fail(path, 'expected an array')
  value.forEach((item, i) => check(item, `${path}[${i}]`))
}
const objectOf = (spec: Spec): Kind => (value, path) => void checkObject(value, path, spec)
const listOf = (spec: Spec): Kind => each((item, path) => void checkObject(item, path, spec))

const chunked: Kind = (value, path) => {
  if (typeof value !== 'boolean' && !(Number.isInteger(value) && (value as number) > 0)) fail(path, 'expected true, false or a positive integer')
}
const toolContent: Kind = each((item, path) => {
  if (!isObject(item)) return fail(path, 'expected an object')
  if ('text' in item) void checkObject(item, path, { 'text!': 'string' })
  else if ('diff' in item) void checkObject(item, path, { 'diff!': objectOf({ 'path!': 'string', oldText: 'string', 'newText!': 'string' }) })
  else fail(path, 'expected {"text": ...} or {"diff": {path, oldText, newText}}')
})
const planEntries: Kind = listOf({
  'content!': 'string',
  'status!': ['pending', 'in_progress', 'completed'],
  'priority!': ['high', 'medium', 'low']
})
const stringArray: Kind = each((item, path) => checkKind(item, 'string', path))
const commandList = listOf({ 'name!': 'string', 'description!': 'string', hint: 'string' })
const anyTrue: Kind = (value, path) => {
  if (value !== true) fail(path, 'expected true')
}
const regexText: Kind = (value, path) => {
  checkKind(value, 'string', path)
  try {
    new RegExp(value as string)
  } catch (error) {
    fail(path, `invalid regular expression (${(error as Error).message})`)
  }
}

const STEP_FIELDS: Record<StepType, Spec> = {
  message: { 'text!': 'string', chunked },
  thought: { 'text!': 'string', chunked },
  plan: { 'entries!': planEntries },
  toolCall: {
    'id!': 'string',
    'title!': 'string',
    kind: TOOL_KINDS,
    status: TOOL_STATUSES,
    rawInput: 'any',
    locations: listOf({ 'path!': 'string', line: 'int' }),
    content: toolContent
  },
  toolCallUpdate: { 'id!': 'string', status: TOOL_STATUSES, title: 'string', content: toolContent, rawOutput: 'any' },
  requestPermission: {
    'toolCallId!': 'string',
    title: 'string',
    'options!': listOf({ 'optionId!': 'string', 'name!': 'string', 'kind!': PERMISSION_KINDS }),
    branches: 'object'
  },
  readFile: { 'path!': 'string', line: 'int', limit: 'int', saveAs: 'string' },
  writeFile: { 'path!': 'string', 'content!': 'string' },
  terminal: { 'command!': 'string', args: stringArray, cwd: 'string', waitForExit: 'boolean', saveAs: 'string' },
  mcpCall: { 'server!': 'string', 'tool!': 'string', arguments: 'object', saveAs: 'string', report: 'boolean', id: 'string' },
  modeChange: { 'modeId!': 'string' },
  usage: { 'used!': 'nonneg', 'size!': 'nonneg' },
  availableCommands: { 'commands!': commandList },
  sessionInfo: { 'title!': 'string' },
  wait: { 'ms!': 'nonneg' },
  extract: { 'from!': 'string', 'regex!': regexText, 'saveAs!': 'string', flags: 'string' },
  expect: { 'from!': 'string', contains: 'string', equals: 'string', regex: regexText, message: 'string' },
  error: { 'message!': 'string', code: 'int' },
  end: { 'stopReason!': STOP_REASONS }
}
const COMMON_STEP_FIELDS: Spec = { type: STEP_TYPES, step: ['auto', 'manual'], delayMs: 'nonneg', label: 'string' }

function validateStep(value: unknown, path: string): void {
  if (!isObject(value)) return fail(path, 'expected an object')
  const type = value.type as StepType
  if (!STEP_TYPES.includes(type)) return fail(`${path}.type`, `expected one of ${STEP_TYPES.join(', ')}`)
  checkObject(value, path, { ...COMMON_STEP_FIELDS, ...STEP_FIELDS[type] })
  if (type === 'expect') {
    const given = ['contains', 'equals', 'regex'].filter((k) => value[k] !== undefined)
    if (given.length !== 1) fail(path, 'expect needs exactly one of contains, equals, regex')
  }
  if (type === 'requestPermission') {
    const options = value.options as Array<{ optionId: string }>
    if (options.length === 0) fail(`${path}.options`, 'needs at least one option')
    const known = new Set([...options.map((o) => o.optionId), 'cancelled'])
    for (const [key, steps] of Object.entries((value.branches as Record<string, unknown>) ?? {})) {
      if (!known.has(key)) fail(`${path}.branches.${key}`, `is not an optionId of this request (options: ${[...known].join(', ')})`)
      validateSteps(steps, `${path}.branches.${key}`)
    }
  }
}

function validateSteps(value: unknown, path: string): void {
  if (!Array.isArray(value)) return fail(path, 'expected an array of steps')
  value.forEach((step, i) => validateStep(step, `${path}[${i}]`))
}

const MATCH_KEYS = ['equals', 'contains', 'regex', 'any'] as const

function validateMatch(value: unknown, path: string): void {
  if (!isObject(value)) return fail(path, 'expected an object')
  const given = MATCH_KEYS.filter((k) => value[k] !== undefined)
  if (given.length !== 1) return fail(path, `needs exactly one of ${MATCH_KEYS.join(', ')}`)
  const key = given[0]
  checkObject(value, path, { [key]: key === 'any' ? anyTrue : key === 'regex' ? regexText : 'string', ignoreCase: 'boolean' })
}

const named = (extra: Spec): Spec => ({ 'id!': 'string', 'name!': 'string', description: 'string', ...extra })

/** Validates parsed JSON; returns it typed. Throws ScriptError naming the JSON path and the reason. */
export function validateScript(value: unknown): Script {
  checkObject(value, '$', {
    $schema: 'string',
    'name!': 'string',
    description: 'string',
    'agent!': objectOf({
      'name!': 'string',
      'version!': 'string',
      modes: listOf({ 'id!': 'string', 'name!': 'string', description: 'string' }),
      models: listOf(named({})),
      commands: commandList
    }),
    defaults: objectOf({ stepMode: ['auto', 'manual'], delayMs: 'nonneg', chunkSize: 'int', chunkDelayMs: 'nonneg', announcePause: 'boolean' }),
    'rules!': each((rule, path) => {
      checkObject(rule, path, { 'id!': 'string', 'match!': validateMatch, once: 'boolean', 'steps!': validateSteps })
    }),
    fallback: validateSteps
  })
  const script = value as unknown as Script
  const seen = new Set<string>()
  script.rules.forEach((rule, i) => {
    if (seen.has(rule.id)) fail(`$.rules[${i}].id`, `duplicate rule id "${rule.id}"`)
    seen.add(rule.id)
  })
  return script
}

/** Reads and validates a script file; every error names the file. */
export function loadScript(file: string): Script {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    throw new Error(`Cannot read script ${file}: ${(error as Error).message}`)
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Script ${file} is not valid JSON: ${(error as Error).message}`)
  }
  try {
    return validateScript(json)
  } catch (error) {
    if (error instanceof ScriptError) throw new Error(`Invalid script ${file}: ${error.message}`)
    throw error
  }
}
