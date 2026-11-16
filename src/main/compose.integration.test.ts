import { existsSync } from 'node:fs'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionDto } from '@shared/models'
import { composeApp, type AppServices } from './compose'
import { RecordingPublisher } from './application/test-helpers'
import { openDatabase } from './infrastructure/db/open-database'

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'infrastructure', 'acp', '__fixtures__', 'fake-agent.ts')

let workspace: string
let app: AppServices
let publisher: RecordingPublisher
let db: ReturnType<typeof openDatabase>

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'a7-int-')))
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

async function waitFor<T>(read: () => Promise<T | undefined | null | false>, what: string): Promise<T> {
  const deadline = Date.now() + 15_000
  for (;;) {
    const value = await read()
    if (value) return value
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 25))
  }
}

async function createSession(): Promise<SessionDto> {
  const folder = await app.api.folders.add(workspace)
  const agent = await app.api.agents.create({
    name: 'Fake agent',
    command: 'node',
    args: ['--experimental-strip-types', '--no-warnings', fixture],
    env: {}
  })
  return app.api.sessions.create(folder.id, agent.id)
}

describe('app composition with the fake ACP agent', () => {
  it('runs a full turn through real repositories: transcript, permission, tasks, change, terminal, status', async () => {
    const session = await createSession()
    expect(session).toMatchObject({ status: 'idle', acpSessionId: 'fake-session', currentModeId: 'default' })
    expect(session.modes.map((m) => m.id)).toEqual(['default', 'plan'])

    const turn = app.api.sessions.prompt({ sessionId: session.id, text: 'Write the output file', attachments: [] })
    const pending = await waitFor(async () => {
      const entries = await app.api.sessions.transcript(session.id)
      return entries.find((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending')
    }, 'the permission request')
    expect(pending.kind === 'tool_call' && pending.permission?.options.map((o) => o.optionId)).toEqual(['allow', 'reject'])
    expect((await app.api.sessions.get(session.id)).status).toBe('awaiting_permission')

    await app.api.sessions.respondPermission(pending.kind === 'tool_call' ? pending.permission!.id : 0, 'allow')
    await turn

    const transcript = await app.api.sessions.transcript(session.id)
    expect(transcript.map((e) => e.kind)).toEqual(['message', 'message', 'tool_call'])
    expect(transcript[0]).toMatchObject({ role: 'user', blocks: [{ kind: 'text', text: 'Write the output file' }] })
    expect(transcript[1]).toMatchObject({ role: 'agent', blocks: [{ kind: 'text', text: 'Working on it' }] })
    expect(transcript[2]).toMatchObject({
      toolCallId: 'tc-1',
      status: 'completed',
      permission: { outcome: 'selected', selectedOptionId: 'allow' }
    })

    expect(await app.api.sessions.tasks(session.id)).toMatchObject([{ content: 'Write file', status: 'in_progress' }])

    const changes = await app.api.sessions.changes(session.id)
    expect(changes).toMatchObject([{ path: 'fake-agent-output.txt', kind: 'added', originalText: null }])
    expect(await readFile(join(workspace, 'fake-agent-output.txt'), 'utf8')).toBe('hello from fake agent\n')

    const terminals = await app.api.sessions.terminals(session.id)
    expect(terminals).toHaveLength(1)
    expect(terminals[0]!.output).toContain('terminal-says-hi')
    expect(terminals[0]!.exitCode).toBe(0)

    const final = await app.api.sessions.get(session.id)
    expect(final.status).toBe('idle')
    expect(final.title).toBe('Write the output file')
    expect(publisher.names()).toEqual(expect.arrayContaining(['changes.changed', 'terminal.changed', 'tasks.changed']))

    await app.api.sessions.revertChange(changes[0]!.id)
    expect(existsSync(join(workspace, 'fake-agent-output.txt'))).toBe(false)
    expect(await app.api.sessions.changes(session.id)).toEqual([])
  }, 30_000)

  it('rejecting the permission cancels the turn and ends idle', async () => {
    const session = await createSession()
    const turn = app.api.sessions.prompt({ sessionId: session.id, text: 'Try it', attachments: [] })
    const requestId = await waitFor(async () => {
      const entry = (await app.api.sessions.transcript(session.id)).find((e) => e.kind === 'tool_call')
      return entry?.kind === 'tool_call' && entry.permission?.outcome === 'pending' ? entry.permission.id : null
    }, 'the permission request')

    await app.api.sessions.respondPermission(requestId, 'reject')
    await turn

    expect(existsSync(join(workspace, 'fake-agent-output.txt'))).toBe(false)
    expect((await app.api.sessions.get(session.id)).status).toBe('idle')
    expect(await app.api.sessions.changes(session.id)).toEqual([])
  }, 30_000)

  it('reports a readable error when the agent command does not exist', async () => {
    const folder = await app.api.folders.add(workspace)
    const agent = await app.api.agents.create({ name: 'Broken', command: 'definitely-not-a-command-xyz', args: [], env: {} })
    await expect(app.api.sessions.create(folder.id, agent.id)).rejects.toThrow(/agent process ended before it was ready/)
    expect(await app.api.sessions.list()).toEqual([])
  })

  it('lists folder contents sandboxed, folders first', async () => {
    const folder = await app.api.folders.add(workspace)
    const { writeFile, mkdir } = await import('node:fs/promises')
    await mkdir(join(workspace, 'src'))
    await mkdir(join(workspace, 'node_modules'))
    await mkdir(join(workspace, '.git'))
    await writeFile(join(workspace, 'a.txt'), 'A')
    expect((await app.api.folders.readDir(folder.id, '')).map((n) => n.name)).toEqual(['src', 'a.txt'])
    expect(await app.api.folders.readFile(folder.id, 'a.txt')).toBe('A')
    await expect(app.api.folders.readFile(folder.id, '../outside.txt')).rejects.toThrow('outside the workspace')
    await expect(app.api.folders.readDir(folder.id, '..')).rejects.toThrow('outside the workspace')
  })
})
