import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import type { PermissionDecision, PermissionPrompt } from '../../domain/agent/PermissionPrompter'
import { ToolRefusedError, type GatedToolGroup, type ToolGate } from '../../domain/agent/ToolGate'
import { AcpAgentConnection } from './AcpAgentConnection'
import { AgentProcess } from './AgentProcess'
import { TerminalManager, type TerminalChange } from './TerminalManager'
import { WorkspaceFileAccess } from './WorkspaceFileAccess'

const fixture = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'fake-agent.ts')

let workspace: string
let proc: AgentProcess | null
let connection: AcpAgentConnection | null
let terminals: TerminalManager

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'a7-e2e-')))
  proc = null
  connection = null
})
afterEach(async () => {
  connection?.dispose()
  await proc?.dispose()
  await terminals?.releaseAll()
  await rm(workspace, { recursive: true, force: true })
})

interface Harness {
  events: AgentSessionEvent[]
  prompts: PermissionPrompt[]
  writes: Array<[string, string | null, string]>
  terminalChanges: TerminalChange[]
}

function start(decide: (p: PermissionPrompt) => Promise<PermissionDecision>, gate?: ToolGate): Harness {
  const h: Harness = { events: [], prompts: [], writes: [], terminalChanges: [] }
  terminals = new TerminalManager((c) => h.terminalChanges.push(c))
  proc = new AgentProcess({
    command: process.execPath,
    args: ['--experimental-strip-types', '--no-warnings', fixture],
    cwd: workspace
  })
  const files = new WorkspaceFileAccess(workspace, (path, before, after) => h.writes.push([path, before, after]))
  connection = new AcpAgentConnection({
    stream: proc.stream,
    sink: { emit: (_key, event) => h.events.push(event) },
    permissions: {
      prompt: (p) => {
        h.prompts.push(p)
        return decide(p)
      }
    },
    files: { forSession: () => files },
    terminals,
    gate
  })
  return h
}

const allow = async (): Promise<PermissionDecision> => ({ outcome: 'selected', optionId: 'allow' })

describe('AcpAgentConnection with a fake agent', () => {
  it('runs a full turn: events, permission, file write, terminal, stop reason', async () => {
    const h = start(allow)
    const info = await connection!.initialize()
    expect(info).toMatchObject({ agentName: 'fake-agent', canLoadSession: false, authMethods: [] })

    const session = await connection!.newSession(workspace, [])
    expect(session.acpSessionId).toBe('fake-session')
    expect(session.currentModeId).toBe('default')
    expect(session.modes.map((m) => m.id)).toEqual(['default', 'plan'])

    const stop = await connection!.prompt(session.acpSessionId, [{ kind: 'text', text: 'go' }])
    expect(stop).toBe('end_turn')

    expect(h.events.map((e) => e.type)).toEqual([
      'message_chunk',
      'plan_replaced',
      'tool_call_created',
      'tool_call_updated'
    ])
    expect(h.events[0]).toMatchObject({ role: 'agent', block: { kind: 'text', text: 'Working on it' } })
    expect(h.events[2]).toMatchObject({ toolCallId: 'tc-1', toolKind: 'edit', status: 'pending' })
    const last = h.events[3]
    expect(last.type === 'tool_call_updated' && last.patch.status).toBe('completed')
    expect(last.type === 'tool_call_updated' && last.patch.rawOutput).toContain('terminal-says-hi')

    expect(h.prompts).toHaveLength(1)
    expect(h.prompts[0]).toMatchObject({ sessionKey: 'fake-session', toolCallId: 'tc-1' })
    expect(h.prompts[0].options.map((o) => o.optionId)).toEqual(['allow', 'reject'])

    const file = join(workspace, 'fake-agent-output.txt')
    expect(await readFile(file, 'utf8')).toBe('hello from fake agent\n')
    expect(h.writes).toEqual([[file, null, 'hello from fake agent\n']])

    expect(h.terminalChanges.at(-1)).toMatchObject({ exitStatus: { exitCode: 0 } })
    expect(h.terminalChanges.some((c) => c.output.includes('terminal-says-hi'))).toBe(true)
  })

  it('ends the turn as cancelled and writes nothing when permission is rejected', async () => {
    const h = start(async () => ({ outcome: 'selected', optionId: 'reject' }))
    await connection!.initialize()
    const { acpSessionId } = await connection!.newSession(workspace)
    expect(await connection!.prompt(acpSessionId, [{ kind: 'text', text: 'go' }])).toBe('cancelled')
    expect(h.writes).toEqual([])
    await expect(readFile(join(workspace, 'fake-agent-output.txt'))).rejects.toThrow()
  })

  it('aborts pending permission prompts on cancel', async () => {
    let sawAbort: Promise<void> | null = null
    const h = start((p) => {
      sawAbort = new Promise((resolve) => p.signal.addEventListener('abort', () => resolve()))
      return new Promise(() => {}) // never answered
    })
    await connection!.initialize()
    const { acpSessionId } = await connection!.newSession(workspace)
    const turn = connection!.prompt(acpSessionId, [{ kind: 'text', text: 'go' }])
    while (h.prompts.length === 0) await new Promise((r) => setTimeout(r, 10))
    await connection!.cancel(acpSessionId)
    await sawAbort
    expect(await turn).toBe('cancelled')
  })

  it('forwards mode changes as events', async () => {
    const h = start(allow)
    await connection!.initialize()
    const { acpSessionId } = await connection!.newSession(workspace)
    await connection!.setMode(acpSessionId, 'plan')
    await new Promise((r) => setTimeout(r, 50))
    expect(h.events).toContainEqual({ type: 'mode_changed', modeId: 'plan' })
  })

  it('refuses loadSession when the agent lacks the capability', async () => {
    start(allow)
    await connection!.initialize()
    await expect(connection!.loadSession('x', workspace)).rejects.toThrow(/does not support/)
  })
})

describe('AcpAgentConnection tool gate', () => {
  const refusing = (group: GatedToolGroup, message: string): ToolGate & { seen: string[] } => {
    const seen: string[] = []
    return {
      seen,
      check: async (acpSessionId, request) => {
        seen.push(`${acpSessionId}:${request.group}:${request.askUser}`)
        if (request.group === group) throw new ToolRefusedError(message)
      }
    }
  }

  it('answers fs/write_text_file with a JSON-RPC error carrying the message when the gate refuses', async () => {
    const gate = refusing('fs.write', 'The Code app is closed on this desktop. Call desktop_open_app with app "code" to open it.')
    start(allow, gate)
    await connection!.initialize()
    const { acpSessionId } = await connection!.newSession(workspace)
    await expect(connection!.prompt(acpSessionId, [{ kind: 'text', text: 'go' }])).rejects.toThrow(/The Code app is closed/)
    await expect(readFile(join(workspace, 'fake-agent-output.txt'))).rejects.toThrow()
    expect(gate.seen).toEqual(['fake-session:fs.write:true'])
  })

  it('refuses terminal/create but lets the earlier write through', async () => {
    const gate = refusing('terminal', 'Agent7 is paused by the user.')
    start(allow, gate)
    await connection!.initialize()
    const { acpSessionId } = await connection!.newSession(workspace)
    await expect(connection!.prompt(acpSessionId, [{ kind: 'text', text: 'go' }])).rejects.toThrow(/paused/)
    expect(await readFile(join(workspace, 'fake-agent-output.txt'), 'utf8')).toBe('hello from fake agent\n')
    expect(gate.seen).toEqual(['fake-session:fs.write:true', 'fake-session:terminal:true'])
  })
})

describe('AgentProcess', () => {
  it('captures bounded stderr and exit info', async () => {
    proc = new AgentProcess({
      command: process.execPath,
      args: ['-e', "for (let i = 0; i < 10; i++) console.error('line' + i)"],
      maxLogLines: 3
    })
    const exit = await proc.exited
    expect(exit.code).toBe(0)
    expect(proc.stderrLog).toEqual(['line7', 'line8', 'line9'])
  })

  it('resolves exited with an error for a missing command', async () => {
    proc = new AgentProcess({ command: 'definitely-not-a-command-xyz', args: [] })
    const exit = await proc.exited
    expect(exit.error?.message).toMatch(/ENOENT/)
  })

  it('kills a long-running agent on dispose', async () => {
    proc = new AgentProcess({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] })
    await proc.dispose()
    expect(proc.running).toBe(false)
  })
})
