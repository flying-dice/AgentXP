import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildResumeArray } from '@ag-ui/client'
import { EventType, type Event } from '@ag-ui/core'
import type { AguiSessionState } from '@shared/agui-state'
import type { SessionDto } from '@shared/models'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectValidStream, RunnerAgent, types } from './application/agui/test-helpers'
import { RecordingPublisher } from './application/test-helpers'
import { composeApp, type AppServices } from './compose'
import { openDatabase } from './infrastructure/db/open-database'

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'infrastructure', 'acp', '__fixtures__', 'fake-agent.ts')

let workspace: string
let app: AppServices
let publisher: RecordingPublisher
let db: ReturnType<typeof openDatabase>

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'a7-agui-')))
  db = openDatabase(':memory:')
  publisher = new RecordingPublisher()
  app = composeApp({
    db,
    publisher,
    picker: { pickFolder: async () => workspace },
    saver: { saveText: async () => null },
    opener: { open: async () => {} },
    a2uiMcp: { electronPath: process.execPath, scriptPath: join(workspace, 'a2ui-mcp.js') }
  })
  await app.start()
})

afterEach(async () => {
  await app.shutdown()
  db.close()
  await rm(workspace, { recursive: true, force: true })
})

async function createSession(): Promise<SessionDto> {
  const folder = await app.api.folders.add(workspace)
  const agent = await app.api.agents.create({
    name: 'Fake agent',
    command: 'node',
    args: ['--experimental-strip-types', '--no-warnings', fixture],
    env: {}
  })
  const session = await app.api.sessions.create(folder.id, agent.id)
  // The fake agent writes a file and runs a command: those need the apps that provide them.
  const desktopId = session.desktopId!
  app.api.desktop.openWindow({ desktopId, app: 'code' })
  app.api.desktop.openWindow({ desktopId, app: 'terminal' })
  app.api.desktop.setPolicy({ ...(await app.api.desktop.policy()), groups: { ...(await app.api.desktop.policy()).groups, terminal: 'allow' } })
  return session
}

const outcomeOf = (events: Event[]): { type: string } | undefined =>
  events.filter((e) => e.type === EventType.RUN_FINISHED).map((e) => (e as { outcome?: { type: string } }).outcome)[0]

describe('AG-UI over the composed app with the fake ACP agent', () => {
  it('runs prompt -> interrupt on permission -> resume -> finished, as a valid AG-UI stream a real client can apply', async () => {
    const session = await createSession()
    const agent = new RunnerAgent(app.agui, String(session.id))
    agent.addMessage({ id: 'u1', role: 'user', content: 'Write the output file' })

    // Run 1: the turn streams until the agent asks for permission.
    await agent.runAgent()
    const run1 = agent.runs[0]!
    await expectValidStream(run1)
    expect(types(run1).slice(0, 2)).toEqual([EventType.RUN_STARTED, EventType.STATE_SNAPSHOT])
    expect(types(run1)).toEqual(expect.arrayContaining([EventType.TEXT_MESSAGE_START, EventType.TOOL_CALL_START, EventType.STATE_DELTA]))
    expect(outcomeOf(run1)).toMatchObject({ type: 'interrupt' })
    expect(agent.pendingInterrupts).toHaveLength(1)
    expect(agent.pendingInterrupts[0]).toMatchObject({ reason: 'tool_permission', toolCallId: 'tc-1', message: 'Allow "Write output"?' })
    let state = agent.state as AguiSessionState
    expect(state.session.status).toBe('awaiting_permission')
    expect(state.tasks).toMatchObject([{ content: 'Write file', status: 'in_progress' }])
    expect(state.toolCalls['tc-1']).toMatchObject({ kind: 'edit', title: 'Write output', status: 'pending' })

    // Run 2: resume with "allow"; the same turn continues to its end.
    await agent.runAgent({
      resume: buildResumeArray(agent.pendingInterrupts, {
        [agent.pendingInterrupts[0]!.id]: { status: 'resolved', payload: { optionId: 'allow' } }
      })
    })
    const run2 = agent.runs[1]!
    await expectValidStream(run2)
    expect(outcomeOf(run2)).toEqual({ type: 'success' })
    expect(types(run2)).toEqual(expect.arrayContaining([EventType.TOOL_CALL_RESULT, EventType.STATE_DELTA]))
    expect(agent.pendingInterrupts).toEqual([])

    state = agent.state as AguiSessionState
    expect(state.session).toMatchObject({ status: 'idle', title: 'Write the output file' })
    expect(state.toolCalls['tc-1']?.status).toBe('completed')
    expect(state.changes).toMatchObject([{ path: 'fake-agent-output.txt', kind: 'added' }])
    const terminals = Object.values(state.terminals)
    expect(terminals).toHaveLength(1)
    expect(terminals[0]).toMatchObject({ exitCode: 0 })
    expect(terminals[0]!.output).toContain('terminal-says-hi')

    expect(agent.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(agent.messages[1]).toMatchObject({
      content: 'Working on it',
      toolCalls: [{ id: 'tc-1', function: { name: 'Write output', arguments: '{"path":"fake-agent-output.txt"}' } }]
    })
    expect(agent.messages[2]).toMatchObject({ toolCallId: 'tc-1', content: '{"terminalOutput":"terminal-says-hi"}' })

    // The shared state the client built from deltas equals what a fresh connect sends.
    const late = new RunnerAgent(app.agui, String(session.id))
    await late.connectAgent()
    await expectValidStream(late.runs[0]!)
    expect(types(late.runs[0]!)).toEqual([EventType.RUN_STARTED, EventType.MESSAGES_SNAPSHOT, EventType.STATE_SNAPSHOT, EventType.RUN_FINISHED])
    expect(late.state).toEqual(JSON.parse(JSON.stringify(agent.state)))
    expect(late.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(late.messages[1]).toMatchObject({ content: 'Working on it', toolCalls: [{ id: 'tc-1' }] })
  }, 30_000)

  it('rejecting the interrupt ends the turn as cancelled', async () => {
    const session = await createSession()
    const agent = new RunnerAgent(app.agui, String(session.id))
    agent.addMessage({ id: 'u1', role: 'user', content: 'Try it' })
    await agent.runAgent()
    expect(agent.pendingInterrupts).toHaveLength(1)

    await agent.runAgent({
      resume: buildResumeArray(agent.pendingInterrupts, {
        [agent.pendingInterrupts[0]!.id]: { status: 'resolved', payload: { optionId: 'reject' } }
      })
    })
    expect(outcomeOf(agent.runs[1]!)).toEqual({ type: 'cancelled' })
    expect((agent.state as AguiSessionState).toolCalls['tc-1']?.status).toBe('failed')
    expect((agent.state as AguiSessionState).session.status).toBe('idle')
  }, 30_000)

  it('abort cancels a turn that is suspended on a permission request', async () => {
    const session = await createSession()
    const agent = new RunnerAgent(app.agui, String(session.id))
    agent.addMessage({ id: 'u1', role: 'user', content: 'Wait here' })
    await agent.runAgent()
    expect(agent.pendingInterrupts).toHaveLength(1)

    await app.agui.abort(String(session.id), 'whatever')
    const reconnect = new RunnerAgent(app.agui, String(session.id))
    await reconnect.connectAgent()
    expect(outcomeOf(reconnect.runs[0]!)).toEqual({ type: 'success' })
    expect((await app.api.sessions.get(session.id)).status).toBe('idle')
  }, 30_000)
})
