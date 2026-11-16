import { beforeEach, describe, expect, it } from 'vitest'
import { AgentConnectionPool } from './AgentConnectionPool'
import { FileChangeRecorder } from './FileChangeRecorder'
import { PermissionBroker } from './PermissionBroker'
import { SessionBroadcaster } from './SessionBroadcaster'
import { SessionEventBus } from './SessionEventBus'
import { SessionEventProjector } from './SessionEventProjector'
import { SessionRuntime } from './SessionRuntime'
import { DEFAULT_SESSION_TITLE, SessionService, titleFromPrompt } from './SessionService'
import { TerminalRecorder } from './TerminalRecorder'
import { WorkspaceFiles } from './WorkspaceFiles'
import { createAppFixture, FakeConnector } from './test-helpers'
import { NodeWorkspaceFileSystem } from '../infrastructure/fs/NodeWorkspaceFileSystem'

let f: ReturnType<typeof createAppFixture>
let connector: FakeConnector
let pool: AgentConnectionPool
let service: SessionService

beforeEach(() => {
  f = createAppFixture()
  connector = new FakeConnector()
  pool = new AgentConnectionPool()
  const { repos, publisher } = f
  const broadcaster = new SessionBroadcaster(repos.sessions, publisher)
  const bus = new SessionEventBus()
  const projector = new SessionEventProjector(repos.sessions, repos.transcripts, repos.tasks, publisher, broadcaster)
  bus.subscribe((id, e) => projector.apply(id, e))
  const runtime = new SessionRuntime({
    connector,
    pool,
    sessions: repos.sessions,
    agents: repos.agents,
    folders: repos.folders,
    events: bus,
    broker: new PermissionBroker(repos.permissions, repos.transcripts, publisher, broadcaster),
    workspaceFiles: new WorkspaceFiles(new NodeWorkspaceFileSystem(), new FileChangeRecorder(repos.changes, publisher)),
    terminals: new TerminalRecorder(repos.terminals, publisher),
    broadcaster,
    a2uiMcpConfig: (id) => ({ kind: 'stdio', name: 'a2ui', command: 'electron', args: ['a2ui-mcp.js'], env: { KEY: String(id) } })
  })
  service = new SessionService({
    sessions: repos.sessions,
    agents: repos.agents,
    folders: repos.folders,
    transcripts: repos.transcripts,
    surfaces: repos.surfaces,
    permissions: repos.permissions,
    pool,
    runtime,
    broadcaster,
    events: publisher
  })
})

const status = (id: number): string | undefined => f.repos.sessions.get(id)?.status

describe('SessionService.create', () => {
  it('spawns the agent in the folder, opens an ACP session with the A2UI MCP server and ends idle', async () => {
    const session = await service.create(f.folderId)

    expect(session).toMatchObject({ title: DEFAULT_SESSION_TITLE, status: 'idle', acpSessionId: 'acp-1', currentModeId: 'default' })
    expect(connector.launches[0]).toMatchObject({ cwd: '/work/project', agent: { id: f.agentId } })
    expect(connector.connections[0]!.mcpServers[0]).toMatchObject({ name: 'a2ui', env: { KEY: String(session.id) } })
    expect(session.modes.map((m) => m.id)).toEqual(['default'])
  })

  it('removes the row and rethrows when the agent cannot start', async () => {
    connector.openError = new Error('spawn failed')
    const before = f.repos.sessions.list().length
    await expect(service.create(f.folderId)).rejects.toThrow('spawn failed')
    expect(f.repos.sessions.list()).toHaveLength(before)
    expect(f.publisher.payloads('session.removed')).toHaveLength(1)
  })

  it('fails readably for unknown folders and agents', async () => {
    await expect(service.create(999)).rejects.toThrow('Folder not found')
    await expect(service.create(f.folderId, 999)).rejects.toThrow('Agent not found')
  })
})

describe('SessionService.prompt', () => {
  it('persists the user message first, goes working, then idle, and auto-titles', async () => {
    const session = await service.create(f.folderId)
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
    const session = await service.create(f.folderId)
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
    const session = await service.create(f.folderId)
    connector.connections[0]!.promptError = new Error('boom')
    await expect(service.prompt({ sessionId: session.id, text: 'x', attachments: [] })).rejects.toThrow('boom')
    expect(status(session.id)).toBe('error')
  })

  it('rejects empty prompts', async () => {
    const session = await service.create(f.folderId)
    await expect(service.prompt({ sessionId: session.id, text: '  ', attachments: [] })).rejects.toThrow('Nothing to send')
  })

  it('sendHidden runs a turn without touching the transcript', async () => {
    const session = await service.create(f.folderId)
    await service.sendHidden(session.id, 'action')
    expect(f.repos.transcripts.list(session.id)).toHaveLength(0)
    expect(connector.connections[0]!.prompts).toHaveLength(1)
  })
})

describe('SessionService reconnect', () => {
  it('reconnects a closed session lazily; loads the ACP session when supported', async () => {
    connector.canLoadSession = true
    const session = await service.create(f.folderId)
    await pool.disposeAll()
    service.recoverAfterRestart()
    expect(status(session.id)).toBe('closed')

    await service.prompt({ sessionId: session.id, text: 'again', attachments: [] })
    expect(connector.connections).toHaveLength(2)
    expect(connector.connections[1]!.calls).toEqual(['loadSession:acp-1', 'prompt'])
    expect(status(session.id)).toBe('idle')
  })

  it('starts a new ACP session silently when load is unsupported', async () => {
    const session = await service.create(f.folderId)
    await pool.disposeAll()
    await service.prompt({ sessionId: session.id, text: 'again', attachments: [] })

    expect(connector.connections[1]!.calls).toEqual(['newSession', 'prompt'])
    expect(f.repos.sessions.get(session.id)?.acpSessionId).toBe('acp-2')
    expect(f.repos.transcripts.list(session.id)).toHaveLength(1)
  })

  it('marks the session closed when the agent process dies', async () => {
    const session = await service.create(f.folderId)
    connector.connections[0]!.crash()
    await new Promise((r) => setTimeout(r, 0))
    expect(status(session.id)).toBe('closed')
    expect(pool.get(session.id)).toBeUndefined()
  })
})

describe('SessionService other commands', () => {
  it('cancels, sets mode/model and publishes the session', async () => {
    const session = await service.create(f.folderId)
    await service.cancel(session.id)
    await service.setMode(session.id, 'plan')
    await service.setModel(session.id, 'fast')

    expect(connector.connections[0]!.calls).toEqual(['newSession', 'cancel', 'setMode:plan', 'setModel:fast'])
    expect(f.repos.sessions.get(session.id)).toMatchObject({ currentModeId: 'plan', currentModelId: 'fast' })
  })

  it('removes a session and disposes its connection', async () => {
    const session = await service.create(f.folderId)
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

describe('titleFromPrompt', () => {
  it('collapses whitespace and truncates to 40 characters', () => {
    expect(titleFromPrompt('  short\n title ')).toBe('short title')
    expect(titleFromPrompt('x'.repeat(100))).toHaveLength(40)
  })
})
