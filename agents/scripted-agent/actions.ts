/** What each step type does on the ACP connection. The runner decides when; this decides what. */
import { RequestError, methods, type AgentContext, type RequestPermissionRequest, type SessionNotification } from '@agentclientprotocol/sdk'
import { abortable, sleep } from './abortable.ts'
import type { McpHub } from './mcp.ts'
import type { Script, Step, ToolContent } from './script.ts'

type Update = SessionNotification['update']
type Of<T extends Step['type']> = Extract<Step, { type: T }>

export interface ActionContext {
  client: AgentContext
  sessionId: string
  cwd: string
  vars: Map<string, string>
  signal: AbortSignal
  mcp: McpHub
  defaults: NonNullable<Script['defaults']>
  /** Fresh ids for tool calls the agent invents (mcpCall). */
  nextId(): string
}

/** The permission outcome (`optionId` or `cancelled`) selects a branch; other steps return nothing. */
export type ActionResult = string | void

export const INTERNAL_ERROR = -32603
export const NO_DEFAULTS: NonNullable<Script['defaults']> = {}

/** Sends one `session/update` notification. */
export function sendUpdate(client: AgentContext, sessionId: string, payload: Record<string, unknown>): Promise<void> {
  return client.notify(methods.client.session.update, { sessionId, update: payload as Update })
}

const update = (ctx: ActionContext, payload: Record<string, unknown>): Promise<void> => sendUpdate(ctx.client, ctx.sessionId, payload)

const toAcpContent = (content: ToolContent[] | undefined): Array<Record<string, unknown>> | undefined =>
  content?.map((item) =>
    'text' in item
      ? { type: 'content', content: { type: 'text', text: item.text } }
      : { type: 'diff', path: item.diff.path, oldText: item.diff.oldText ?? null, newText: item.diff.newText }
  )

/** Splits text into chunk-size pieces when chunking is on (`chunked` of the step beats `defaults.chunkSize`). */
export function chunksOf(text: string, chunked: boolean | number | undefined, defaultSize: number | undefined): string[] {
  const size = chunked === false ? undefined : typeof chunked === 'number' ? chunked : chunked === true ? (defaultSize ?? 8) : defaultSize
  if (!size || text.length <= size) return [text]
  const pieces: string[] = []
  for (let i = 0; i < text.length; i += size) pieces.push(text.slice(i, i + size))
  return pieces
}

async function streamText(ctx: ActionContext, kind: 'agent_message_chunk' | 'agent_thought_chunk', step: Of<'message' | 'thought'>): Promise<void> {
  const pieces = chunksOf(step.text, step.chunked, ctx.defaults.chunkSize)
  for (const [i, text] of pieces.entries()) {
    if (i > 0) await sleep(ctx.defaults.chunkDelayMs ?? 0, ctx.signal)
    await update(ctx, { sessionUpdate: kind, content: { type: 'text', text } })
  }
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Runs a client request; with `saveAs` a failure becomes the variable's text (and `<saveAs>.isError`), else it fails the turn. */
async function capture(ctx: ActionContext, saveAs: string | undefined, run: () => Promise<string>): Promise<void> {
  try {
    const text = await run()
    if (saveAs) {
      ctx.vars.set(saveAs, text)
      ctx.vars.set(`${saveAs}.isError`, 'false')
    }
  } catch (error) {
    if (!saveAs || ctx.signal.aborted) throw error
    ctx.vars.set(saveAs, message(error))
    ctx.vars.set(`${saveAs}.isError`, 'true')
  }
}

async function runTerminal(ctx: ActionContext, step: Of<'terminal'>): Promise<string> {
  const terminal = await ctx.client.createTerminal({ sessionId: ctx.sessionId, command: step.command, args: step.args, cwd: step.cwd })
  try {
    let exitCode = ''
    if (step.waitForExit !== false) {
      const exit = await abortable(terminal.waitForExit(), ctx.signal)
      exitCode = String(exit.exitCode ?? exit.signal ?? '')
    }
    const { output } = await terminal.currentOutput()
    if (step.saveAs) ctx.vars.set(`${step.saveAs}.exitCode`, exitCode)
    return output
  } finally {
    await terminal.kill().catch(() => undefined)
    await terminal.release().catch(() => undefined)
  }
}

async function callMcp(ctx: ActionContext, step: Of<'mcpCall'>): Promise<void> {
  const report = step.report !== false
  const id = step.id ?? ctx.nextId()
  const args = step.arguments ?? {}
  if (report) {
    await update(ctx, { sessionUpdate: 'tool_call', toolCallId: id, title: `${step.server}.${step.tool}`, kind: 'other', status: 'in_progress', rawInput: args })
  }
  const result = await ctx.mcp.call(step.server, step.tool, args, ctx.signal)
  if (step.saveAs) {
    ctx.vars.set(step.saveAs, result.text)
    ctx.vars.set(`${step.saveAs}.isError`, String(result.isError))
  }
  if (report) {
    await update(ctx, {
      sessionUpdate: 'tool_call_update',
      toolCallId: id,
      status: result.isError ? 'failed' : 'completed',
      content: [{ type: 'content', content: { type: 'text', text: result.text } }],
      rawOutput: { text: result.text, isError: result.isError }
    })
  }
}

/** Stores the first group (else the whole match) of a regex run on a variable: how a script picks a ref out of a tool result. */
function extractVar(ctx: ActionContext, step: Of<'extract'>): void {
  const value = ctx.vars.get(step.from)
  if (value === undefined) throw new RequestError(INTERNAL_ERROR, `extract failed: variable "${step.from}" does not exist (known: ${[...ctx.vars.keys()].join(', ') || 'none'})`)
  const match = new RegExp(step.regex, step.flags).exec(value)
  if (!match) throw new RequestError(INTERNAL_ERROR, `extract failed: /${step.regex}/ does not match variable "${step.from}"; it is ${JSON.stringify(value.slice(0, 300))}`)
  ctx.vars.set(step.saveAs, match[1] ?? match[0])
}

function expectVar(ctx: ActionContext, step: Of<'expect'>): void {
  const value = ctx.vars.get(step.from)
  const fail = (why: string): never => {
    throw new RequestError(INTERNAL_ERROR, step.message ?? `expect failed: variable "${step.from}" ${why}`)
  }
  if (value === undefined) return fail(`does not exist (known: ${[...ctx.vars.keys()].join(', ') || 'none'})`)
  if (step.contains !== undefined && !value.includes(step.contains)) fail(`does not contain ${JSON.stringify(step.contains)}; it is ${JSON.stringify(value.slice(0, 200))}`)
  if (step.equals !== undefined && value !== step.equals) fail(`is not ${JSON.stringify(step.equals)}; it is ${JSON.stringify(value.slice(0, 200))}`)
  if (step.regex !== undefined && !new RegExp(step.regex).test(value)) fail(`does not match /${step.regex}/; it is ${JSON.stringify(value.slice(0, 200))}`)
}

async function askPermission(ctx: ActionContext, step: Of<'requestPermission'>): Promise<string> {
  const request: RequestPermissionRequest = {
    sessionId: ctx.sessionId,
    toolCall: { toolCallId: step.toolCallId, title: step.title ?? null },
    options: step.options
  }
  const response = await ctx.client.request(methods.client.session.requestPermission, request)
  const key = response.outcome.outcome === 'selected' ? response.outcome.optionId : 'cancelled'
  ctx.vars.set('permission', key)
  return key
}

type Action<T extends Step['type']> = (step: Of<T>, ctx: ActionContext) => Promise<ActionResult>
type Actions = { [T in Exclude<Step['type'], 'end'>]: Action<T> }

export const ACTIONS: Actions = {
  message: (step, ctx) => streamText(ctx, 'agent_message_chunk', step),
  thought: (step, ctx) => streamText(ctx, 'agent_thought_chunk', step),
  plan: (step, ctx) => update(ctx, { sessionUpdate: 'plan', entries: step.entries }),
  toolCall: (step, ctx) =>
    update(ctx, {
      sessionUpdate: 'tool_call',
      toolCallId: step.id,
      title: step.title,
      kind: step.kind ?? 'other',
      status: step.status ?? 'pending',
      ...(step.rawInput === undefined ? {} : { rawInput: step.rawInput }),
      ...(step.locations ? { locations: step.locations } : {}),
      ...(step.content ? { content: toAcpContent(step.content) } : {})
    }),
  toolCallUpdate: (step, ctx) =>
    update(ctx, {
      sessionUpdate: 'tool_call_update',
      toolCallId: step.id,
      ...(step.status ? { status: step.status } : {}),
      ...(step.title ? { title: step.title } : {}),
      ...(step.content ? { content: toAcpContent(step.content) } : {}),
      ...(step.rawOutput === undefined ? {} : { rawOutput: step.rawOutput })
    }),
  requestPermission: (step, ctx) => askPermission(ctx, step),
  readFile: (step, ctx) =>
    capture(ctx, step.saveAs, async () => {
      const response = await ctx.client.request(methods.client.fs.readTextFile, { sessionId: ctx.sessionId, path: step.path, line: step.line, limit: step.limit })
      return response.content
    }),
  writeFile: (step, ctx) =>
    ctx.client.request(methods.client.fs.writeTextFile, { sessionId: ctx.sessionId, path: step.path, content: step.content }).then(() => undefined),
  terminal: (step, ctx) => capture(ctx, step.saveAs, () => runTerminal(ctx, step)),
  mcpCall: (step, ctx) => callMcp(ctx, step),
  modeChange: (step, ctx) => update(ctx, { sessionUpdate: 'current_mode_update', currentModeId: step.modeId }),
  usage: (step, ctx) => update(ctx, { sessionUpdate: 'usage_update', used: step.used, size: step.size }),
  availableCommands: (step, ctx) =>
    update(ctx, {
      sessionUpdate: 'available_commands_update',
      availableCommands: step.commands.map((c) => ({ name: c.name, description: c.description, input: c.hint ? { hint: c.hint } : null }))
    }),
  sessionInfo: (step, ctx) => update(ctx, { sessionUpdate: 'session_info_update', title: step.title }),
  wait: (step, ctx) => sleep(step.ms, ctx.signal),
  extract: async (step, ctx) => extractVar(ctx, step),
  expect: async (step, ctx) => expectVar(ctx, step),
  error: async (step) => {
    throw new RequestError(step.code ?? INTERNAL_ERROR, step.message)
  }
}
