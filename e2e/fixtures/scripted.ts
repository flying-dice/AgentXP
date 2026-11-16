/**
 * The scripted ACP agent (agents/scripted-agent) as an e2e fixture: a JSON script decides what the "model" says and
 * does, a control socket steps it. See agents/scripted-agent/README.md and docs/CONVENTIONS.md "Scripted agent specs".
 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Page } from 'playwright'
import type { ProtocolEventDto } from '../../src/shared/desktop'
import { connect, type ControlClient } from '../../agents/scripted-agent/controlClient'
import { projectRoot } from './launch'
import { startConnectedDesktop, type ConnectedDesktop } from './session'
import { readProtocolEvents, registerAgent, type Workspace } from './setup'

const require = createRequire(import.meta.url)

export interface ScriptedAgent {
  readonly agentId: number
  readonly socketPath: string
  /** A connected control client (waits for the agent process, which starts with the first chat turn). Closed by `close()`. */
  control(): Promise<ControlClient>
  close(): Promise<void>
}

export interface ScriptedAgentOptions {
  /** A script name from agents/scripted-agent/scripts (`demo`, `stepping`, ...) or a path to a JSON file. */
  script: string
  /** Overrides the script's `defaults.stepMode` before the agent starts (no race with the first prompt). */
  stepMode?: 'auto' | 'manual'
  name?: string
}

const scriptFile = (script: string): string => {
  const candidates = [resolve(script), join(projectRoot, 'agents/scripted-agent/scripts', script), join(projectRoot, 'agents/scripted-agent/scripts', `${script}.json`)]
  const found = candidates.find((c) => c.endsWith('.json') && existsSync(c))
  if (!found) throw new Error(`no scripted-agent script ${script}`)
  return found
}

/**
 * Registers the BUILT scripted agent (`out/main/scripted-agent.js` on Electron's node mode, like the built-in agent)
 * as the default agent, with a private control socket. Call it as the `agent` option of `startConnectedDesktop`.
 */
export async function useScriptedAgent(page: Page, options: ScriptedAgentOptions): Promise<ScriptedAgent> {
  const dir = await mkdtemp(join(tmpdir(), 'a7-script-'))
  const socketPath = process.platform === 'win32' ? `\\\\.\\pipe\\a7-script-${Date.now()}-${Math.random().toString(36).slice(2)}` : join(dir, 'control.sock')
  let file = scriptFile(options.script)
  if (options.stepMode) {
    const script = JSON.parse(readFileSync(file, 'utf8')) as { defaults?: object }
    file = join(dir, 'script.json')
    await writeFile(file, JSON.stringify({ ...script, defaults: { ...script.defaults, stepMode: options.stepMode } }))
  }
  const agentId = await registerAgent(page, {
    name: options.name ?? `Scripted ${options.script}`,
    command: require('electron') as string,
    args: [join(projectRoot, 'out/main/scripted-agent.js'), '--script', file],
    env: { ELECTRON_RUN_AS_NODE: '1', AGENT7_SCRIPT_CONTROL: socketPath }
  })
  let client: Promise<ControlClient> | null = null
  const open = async (): Promise<ControlClient> => {
    const deadline = Date.now() + 30_000
    for (;;) {
      try {
        return await connect(socketPath)
      } catch (error) {
        if (Date.now() > deadline) throw error
        await new Promise((r) => setTimeout(r, 50))
      }
    }
  }
  return {
    agentId,
    socketPath,
    control: () => (client ??= open()),
    async close() {
      if (client) (await client.catch(() => null))?.close()
      await rm(dir, { recursive: true, force: true })
    }
  }
}

/** Protocol events of one chat (oldest first). See `readProtocolEvents` in setup.ts: read-only instrumentation. */
export const protocolEvents = (desktopPage: Page, query: { source?: ProtocolEventDto['source']; sessionId?: number }): Promise<ProtocolEventDto[]> => readProtocolEvents(desktopPage, query)

/** Names of events, optionally only those of one direction. */
export const protocolNames = (events: readonly ProtocolEventDto[], direction?: 'in' | 'out'): string[] => events.filter((e) => !direction || e.direction === direction).map((e) => e.name)

/** Collapses runs of the same name (`TEXT_MESSAGE_CONTENT` x5 -> once), so counts of streamed chunks do not matter. */
export const collapseRuns = (names: readonly string[]): string[] => names.filter((name, i) => name !== names[i - 1])

/** True when `expected` appears in `names` in this order (other names may lie between). */
export function containsInOrder(names: readonly string[], expected: readonly string[]): boolean {
  let next = 0
  for (const name of names) if (name === expected[next]) next++
  return next >= expected.length
}

/** The parsed JSON payload of a protocol event. */
export const payloadOf = <T = Record<string, unknown>>(event: ProtocolEventDto): T => JSON.parse(event.payload) as T

/** Splits AG-UI events into runs (each starts with RUN_STARTED). The first run of a chat is the connect/attach run. */
export function aguiRuns(events: readonly ProtocolEventDto[]): ProtocolEventDto[][] {
  const runs: ProtocolEventDto[][] = []
  for (const event of events) {
    if (event.name === 'RUN_STARTED') runs.push([])
    runs.at(-1)?.push(event)
  }
  return runs
}

/** Names without the STATE_* bookkeeping and with repeated streaming events collapsed: the shape of a run's messages. */
export const messageShape = (events: readonly ProtocolEventDto[]): string[] => collapseRuns(events.map((e) => e.name).filter((n) => !n.startsWith('STATE_')))

/** JSON-patch paths of every STATE_DELTA in the events (`/tasks/0`, `/toolCalls/edit-1/status`, ...). */
export const deltaPaths = (events: readonly ProtocolEventDto[]): string[] =>
  events.filter((e) => e.name === 'STATE_DELTA').flatMap((e) => payloadOf<{ delta: { path: string }[] }>(e).delta.map((d) => d.path))

/** The `outcome.type` of a RUN_FINISHED event (`success`, `interrupt`, `cancelled`). */
export const outcomeOf = (event: ProtocolEventDto | undefined): string | undefined => (event ? payloadOf<{ outcome?: { type: string } }>(event).outcome?.type : undefined)

export interface ScriptedDesktop extends ConnectedDesktop {
  readonly scripted: ScriptedAgent
  /** Closes the app, the control socket and the workspace. */
  close(): Promise<void>
}

/** App + desktop + scripted agent as the default agent (+ optional workspace added as a project). */
export async function startScriptedDesktop(options: ScriptedAgentOptions & { title?: string; workspace?: Workspace }): Promise<ScriptedDesktop> {
  let scripted: ScriptedAgent | undefined
  const ctx = await startConnectedDesktop({
    title: options.title ?? `Scripted ${options.script}`,
    workspace: options.workspace,
    agent: async (page) => {
      scripted = await useScriptedAgent(page, options)
    }
  })
  return {
    ...ctx,
    scripted: scripted!,
    async close() {
      await ctx.app.close()
      await scripted?.close()
      await options.workspace?.remove()
    }
  }
}
