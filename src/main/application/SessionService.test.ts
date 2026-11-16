import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { allowAllTools } from '../domain/agent/ToolGate'
import { AgentConnectionPool } from './AgentConnectionPool'
import { FileChangeRecorder } from './FileChangeRecorder'
import { PermissionBroker } from './PermissionBroker'
import { SessionBroadcaster } from './SessionBroadcaster'
import { SessionEventBus } from './SessionEventBus'
import { SessionEventProjector } from './SessionEventProjector'
import { SessionProblems } from './SessionProblems'
import { SessionRuntime } from './SessionRuntime'
import { DEFAULT_SESSION_TITLE, SessionService, titleFromPrompt, type SessionServiceDeps } from './SessionService'
import { TerminalRecorder } from './TerminalRecorder'
import { SessionFiles } from './SessionFiles'
import { createVfsFixture, FakeConnector } from './test-helpers'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let connector: FakeConnector
let pool: AgentConnectionPool
let service: SessionService
let serviceDeps: SessionServiceDeps
let problems: SessionProblems

beforeEach(async () => {
  f = await createVfsFixture()
  connector = new FakeConnector()
  pool = new AgentConnectionPool()
  const { repos, publisher } = f
  const broadcaster = new SessionBroadcaster(repos.sessions, publisher)
  const bus = new SessionEventBus()
  const projector = new SessionEventProjector(repos.sessions, repos.transcripts, repos.tasks, publisher, broadcaster)
  bus.subscribe((id, e) => projector.apply(id, e))
  problems = new SessionProblems()
  const runtime = new SessionRuntime({
    problems,
    connector,
    pool,
    sessions: repos.sessions,
    agents: repos.agents,
    vfs: f.vfs,
    events: bus,
    broker: new PermissionBroker(repos.permissions, repos.transcripts, publisher, broadcaster),
    files: new SessionFiles({ vfs: f.vfs, host: f.host, sessions: repos.sessions, recorder: new FileChangeRecorder(repos.changes, publisher) }),
    terminals: new TerminalRecorder(repos.terminals, publisher),
    broadcaster,
    toolGate: () => allowAllTools,
    a2uiMcpConfig: (id) => ({ kind: 'stdio', name: 'a2ui', command: 'electron', args: ['a2ui-mcp.js'], env: { KEY: String(id) } })
  })
  serviceDeps = {
    sessions: repos.sessions,
    agents: repos.agents,
    vfs: f.vfs,
    transcripts: repos.transcripts,
    surfaces: repos.surfaces,
    permissions: repos.permissions,
    pool,
    runtime,
    broadcaster,
    problems,
    events: publisher
  }
  service = new SessionService(serviceDeps)
})

const status = (id: number): string | undefined => f.repos.sessions.get(id)?.status

describe('SessionService.create', () => {
  it('spawns the agent in the real folder behind the chat\'s working directory (default: the agent home on C:)', async () => {
    const session = await service.create(f.desktop.id)

    expect(session).toMatchObject({ title: DEFAULT_SESSION_TITLE, status: 'idle', acpSessionId: 'acp-1', currentModeId: 'default', cwd: 'C:\\Users\\Agent' })
    expect(connector.launches[0]).toMatchObject({ cwd: join(f.desktopsDir, String(f.desktop.id), 'C', 'Users', 'Agent'), agent: { id: f.agentId } })
    expect(connector.connections[0]!.mcpServers[0]).toMatchObject({ name: 'a2ui', env: { KEY: String(session.id) } })
    expect(session.modes.map((m) => m.id)).toEqual(['default'])
  })

  it('starts the agent in a plugged-in project when the chat\'s cwd is on its drive', async () => {
    const session = await service.create(f.desktop.id, undefined, 'E:\\')
    expect(session.cwd).toBe('E:\\')
    expect(connector.launches[0]!.cwd).toBe(f.projectDir)
  })

  it('refuses a working directory on a drive that is not plugged in or that does not exist', async () => {
    await expect(service.create(f.desktop.id, undefined, 'G:\\')).rejects.toThrow('Drive G: is not plugged in')
    await expect(service.create(f.desktop.id, undefined, 'E:\\missing')).rejects.toThrow('does not exist')
    await expect(service.create(f.desktop.id, undefined, 'src')).rejects.toThrow('Not a valid working directory')
  })

  it('removes the row and rethrows when the agent cannot start', async () => {
    connector.openError = new Error('spawn failed')
    const before = f.repos.sessions.list().length
    await expect(service.create(f.desktop.id)).rejects.toThrow('spawn failed')
    expect(f.repos.sessions.list()).toHaveLength(before)
    expect(f.publisher.payloads('session.removed')).toHaveLength(1)
  })

  it('fails readably for unknown agents', async () => {
    await expect(service.create(f.desktop.id, 999)).rejects.toThrow('Agent not found')
  })
})

describe('SessionService.prompt', () => {
  it('persists the user message first, goes working, then idle, and auto-titles', async () => {
    const session = await service.create(f.desktop.id)
    const connection = connector.connections[0]!
    const seen: string[] = []
    connection.onPrompt = async () => {
      seen.push(`${status(session.id)}:${f.repos.transcripts.list(session.id).length}`)
    }

    await service.prompt({ sessionId: session.id, text: 'Please refactor the whole parser module now', attachments: [] })

    expect(seen).toEqual(['working:1'])
    expect(status(session.id)).toBe('idle')
    expect(f.repos.transcripts.list(session.id)[0]).toMatchObject({ kind: 'message', role: 'user' })
    expect(f.repos.sessions.get(session.id)?.title).toBe('Please refactor the whole parser module…')
    expect(connection.prompts[0]).toEqual([{ kind: 'text', text: 'Please refactor the whole parser module now' }])
  })

  it('keeps a custom title and sends attachments as resource links', async () => {
    const session = await service.create(f.desktop.id)
    service.rename(session.id, 'Mine')
    await service.prompt({ sessionId: session.id, text: 'hello', attachments: ['/work/project/a b.ts'] })

    expect(f.repos.sessions.get(session.id)?.title).toBe('Mine')
    expect(connector.connections[0]!.prompts[0]![1]).toMatchObject({
      kind: 'resource_link',
      name: 'a b.ts',
      uri: 'file:///work/project/a%20b.ts'
    })
  })

  it('sets error status and rethrows when the turn fails', async () => {
    const session = await service.create(f.desktop.id)
    connector.connections[0]!.promptError = new Error('boom')
    await expect(service.prompt({ sessionId: session.id, text: 'x', attachments: [] })).rejects.toThrow('boom')
    expect(status(session.id)).toBe('error')
  })

  it('rejects empty prompts', async () => {
    const session = await service.create(f.desktop.id)
    await expect(service.prompt({ sessionId: session.id, text: '  ', attachments: [] })).rejects.toThrow('Nothing to send')
  })

  it('sendHidden runs a turn without touching the transcript', async () => {
    const session = await service.create(f.desktop.id)
    await service.sendHidden(session.id, 'action')
    expect(f.repos.transcripts.list(session.id)).toHaveLength(0)
    expect(connector.connections[0]!.prompts).toHaveLength(1)
  })
})

describe('SessionService.prompt desktop context', () => {
  const json = '{"desktopId":1}'
  const resource = { kind: 'resource', uri: 'agent7://desktop/state', mimeType: 'application/json', text: json }

  it('puts the client\'s desktop state before the user\'s text and stores it with the message', async () => {
    const session = await service.create(f.desktop.id)
    await service.promptTurn({ sessionId: session.id, text: 'hello', attachments: [], desktopContext: json })
    expect(connector.connections[0]!.prompts[0]).toEqual([resource, { kind: 'text', text: 'hello' }])
    expect(f.repos.transcripts.list(session.id)[0]).toMatchObject({ role: 'user', blocks: [resource, { kind: 'text', text: 'hello' }] })
  })

  it('adds the current desktop state itself when the client sent none (main is the truth)', async () => {
    service = new SessionService({ ...serviceDeps, desktopContext: { contextOfSession: () => json } })
    const session = await service.create(f.desktop.id)
    await service.prompt({ sessionId: session.id, text: 'hello', attachments: [] })
    expect(connector.connections[0]!.prompts[0]).toEqual([resource, { kind: 'text', text: 'hello' }])
  })

  it('sends only the text for a chat without a desktop', async () => {
    service = new SessionService({ ...serviceDeps, desktopContext: { contextOfSession: () => null } })
    const session = await service.create(f.desktop.id)
    await service.prompt({ sessionId: session.id, text: 'hello', attachments: [] })
    expect(connector.connections[0]!.prompts[0]).toEqual([{ kind: 'text', text: 'hello' }])
  })

  it('does not count the desktop block as something to send alone', async () => {
    const session = await service.create(f.desktop.id)
    await expect(service.promptTurn({ sessionId: session.id, text: '  ', attachments: [], desktopContext: json })).rejects.toThrow('Nothing to send')
  })
})

describe('SessionService reconnect', () => {
  it('reconnects a closed session lazily; loads the ACP session when supported', async () => {
    connector.canLoadSession = true
    const session = await service.create(f.desktop.id)
    await pool.disposeAll()
    service.recoverAfterRestart()
    expect(status(session.id)).toBe('closed')

    await service.prompt({ sessionId: session.id, text: 'again', attachments: [] })
    expect(connector.connections).toHaveLength(2)
    expect(connector.connections[1]!.calls).toEqual(['loadSession:acp-1', 'prompt'])
    expect(status(session.id)).toBe('idle')
  })

  it('starts a new ACP session silently when load is unsupported', async () => {
    const session = await service.create(f.desktop.id)
    await pool.disposeAll()
    await service.prompt({ sessionId: session.id, text: 'again', attachments: [] })

    expect(connector.connections[1]!.calls).toEqual(['newSession', 'prompt'])
    expect(f.repos.sessions.get(session.id)?.acpSessionId).toBe('acp-2')
    expect(f.repos.transcripts.list(session.id)).toHaveLength(1)
  })

  it('marks the session closed when the agent process dies', async () => {
    const session = await service.create(f.desktop.id)
    connector.connections[0]!.crash()
    await new Promise((r) => setTimeout(r, 0))
    expect(status(session.id)).toBe('closed')
    expect(pool.get(session.id)).toBeUndefined()
  })
})

describe('SessionService other commands', () => {
  it('cancels, sets mode/model and publishes the session', async () => {
    const session = await service.create(f.desktop.id)
    await service.cancel(session.id)
    await service.setMode(session.id, 'plan')
    await service.setModel(session.id, 'fast')

    expect(connector.connections[0]!.calls).toEqual(['newSession', 'cancel', 'setMode:plan', 'setModel:fast'])
    expect(f.repos.sessions.get(session.id)).toMatchObject({ currentModeId: 'plan', currentModelId: 'fast' })
  })

  it('removes a session and disposes its connection', async () => {
    const session = await service.create(f.desktop.id)
    await service.remove(session.id)
    expect(connector.connections[0]!.disposed).toBe(true)
    expect(f.repos.sessions.get(session.id)).toBeNull()
    expect(f.publisher.payloads('session.removed')).toEqual([{ id: session.id }])
  })

  it('clears the transcript and publishes', async () => {
    f.repos.transcripts.appendMessage(f.sessionId, 'user', [{ kind: 'text', text: 'hi' }])
    service.clearTranscript(f.sessionId)
    expect(f.repos.transcripts.list(f.sessionId)).toHaveLength(0)
    expect(f.publisher.payloads('transcript.cleared')).toEqual([{ sessionId: f.sessionId }])
  })
})

describe('SessionService: starting in the background and problems', () => {
  it('returns at once with status connecting when the agent starts in the background, then becomes idle', async () => {
    const session = await service.create(f.desktop.id, undefined, undefined, undefined, { background: true })
    expect(session.status).toBe('connecting')
    await vi.waitFor(() => expect(status(session.id)).toBe('idle'))
  })

  it('records a start failure as a problem in plain words and sets the error status', async () => {
    connector.openError = new Error('spawn not-a-real-command ENOENT')
    const session = await service.create(f.desktop.id, undefined, undefined, undefined, { background: true })
    await vi.waitFor(() => expect(status(session.id)).toBe('error'))
    expect(problems.get(session.id)).toMatchObject({ kind: 'start-failed', detail: 'spawn not-a-real-command ENOENT' })
    expect(problems.get(session.id)?.message).toMatch(/could not start/)
  })

  it('Restart ends the program, clears the problem and starts a new one', async () => {
    connector.openError = new Error('boom')
    const session = await service.create(f.desktop.id, undefined, undefined, undefined, { background: true })
    await vi.waitFor(() => expect(problems.get(session.id)).not.toBeNull())
    connector.openError = null
    await service.restartAgent(session.id)
    expect(problems.get(session.id)).toBeNull()
    expect(status(session.id)).toBe('idle')
  })

  it('retry removes the last user message so that sending again does not duplicate it', async () => {
    const session = await service.create(f.desktop.id)
    f.repos.transcripts.appendMessage(session.id, 'user', [{ kind: 'text', text: 'hello' }])
    expect(service.retry(session.id)).toBe(true)
    expect(f.repos.transcripts.list(session.id)).toHaveLength(0)
    expect(service.retry(session.id)).toBe(false)
  })
})

describe('titleFromPrompt', () => {
  it('collapses whitespace and truncates to 40 characters', () => {
    expect(titleFromPrompt('  short\n title ')).toBe('short title')
    expect(titleFromPrompt('x'.repeat(100))).toHaveLength(40)
  })
})
