import { existsSync } from 'node:fs'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [folder.id] })
  const session = await app.api.sessions.create(desktop.id, agent.id, 'E:\\')
  // The fake agent writes a file and runs a command: those need the apps that provide them.
  const desktopId = session.desktopId!
  app.api.desktop.openWindow({ desktopId, app: 'code' })
  app.api.desktop.openWindow({ desktopId, app: 'terminal' })
  app.api.desktop.setPolicy({ ...(await app.api.desktop.policy()), groups: { ...(await app.api.desktop.policy()).groups, terminal: 'allow' } })
  return session
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
    // The prompt carries the desktop state first (stored, but not shown as the user's text).
    expect(transcript[0]).toMatchObject({
      role: 'user',
      blocks: [{ kind: 'resource', uri: 'agent7://desktop/state', mimeType: 'application/json' }, { kind: 'text', text: 'Write the output file' }]
    })
    expect(transcript[1]).toMatchObject({ role: 'agent', blocks: [{ kind: 'text', text: 'Working on it' }] })
    expect(transcript[2]).toMatchObject({
      toolCallId: 'tc-1',
      status: 'completed',
      permission: { outcome: 'selected', selectedOptionId: 'allow' }
    })

    expect(await app.api.sessions.tasks(session.id)).toMatchObject([{ content: 'Write file', status: 'in_progress' }])

    const changes = await app.api.sessions.changes(session.id)
    expect(changes).toMatchObject([{ path: 'E:\\fake-agent-output.txt', kind: 'added', originalText: null }])
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
    const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [] })
    const agent = await app.api.agents.create({ name: 'Broken', command: 'definitely-not-a-command-xyz', args: [], env: {} })
    await expect(app.api.sessions.create(desktop.id, agent.id)).rejects.toThrow(/agent process ended before it was ready/)
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

  it('desktops: a chat lives on a desktop, its window follows the chat, and desktop events carry the derived tools and drives', async () => {
    const folder = await app.api.folders.add(workspace)
    const agent = await app.api.agents.create({ name: 'Fake agent', command: 'node', args: ['--experimental-strip-types', '--no-warnings', fixture], env: {} })
    const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [folder.id] })
    expect(desktop).toMatchObject({ title: 'Project', connected: false, chatCount: 0, runState: 'idle' })
    expect(desktop.drives.map((d) => `${d.letter}:${d.folderId}`)).toEqual(['C:null', `E:${folder.id}`])

    const chat = await app.api.desktop.newChat(desktop.id, agent.id, 'E:\\')
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    // The window opens at once; the agent starts in the background (the chat is `connecting` until it is up).
    expect(await app.api.sessions.get(sessionId)).toMatchObject({ desktopId: desktop.id, cwd: 'E:\\' })
    await vi.waitFor(async () => expect(await app.api.sessions.get(sessionId)).toMatchObject({ status: 'idle' }))

    await app.api.desktop.openWindow({ desktopId: desktop.id, app: 'terminal' })
    const changed = publisher.payloads('desktop.changed')
    expect(changed.at(-1)).toMatchObject({ desktopId: desktop.id, tools: ['shell', 'terminal', 'board'], home: 'C:\\Users\\Agent' })
    expect(changed.at(-1)?.drives.map((d) => d.letter)).toEqual(['C', 'E'])
    expect(changed.at(-1)?.windows.map((w) => w.app)).toEqual(['chat', 'terminal'])

    // Running agents show up in the Agent Manager, and ending the process closes the chat.
    expect(await app.api.processes.list()).toMatchObject([{ agentId: agent.id, desktopId: desktop.id, sessionIds: [sessionId] }])
    await app.api.processes.end(agent.id, desktop.id)
    expect((await app.api.sessions.get(sessionId)).status).toBe('closed')

    // Deleting the chat removes its window.
    await app.api.sessions.remove(sessionId)
    expect(publisher.payloads('desktop.changed').at(-1)?.windows.map((w) => w.app)).toEqual(['terminal'])
    expect((await app.api.launcher.list()).map((d) => d.id)).toEqual([desktop.id])
  }, 30_000)

  it('the virtual file system: C: is seeded, the project is E:, ejecting cuts the agent off', async () => {
    const folder = await app.api.folders.add(workspace)
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'a.txt'), 'A')
    const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [folder.id] })

    expect((await app.api.vfs.readDir(desktop.id, '')).map((e) => e.path)).toEqual(['C:\\', 'E:\\'])
    expect((await app.api.vfs.readDir(desktop.id, 'C:\\Users\\Agent')).map((e) => e.name)).toEqual(['Desktop', 'Documents', 'Downloads'])
    expect(await app.api.vfs.readFile(desktop.id, 'E:\\a.txt')).toBe('A')
    await app.api.vfs.writeFile(desktop.id, 'C:\\Users\\Agent\\Documents\\n.md', '# hi')
    expect(await app.api.vfs.stat(desktop.id, 'C:\\Users\\Agent\\Documents\\n.md')).toMatchObject({ kind: 'file', size: 4 })
    await expect(app.api.vfs.readFile(desktop.id, 'E:\\..\\..\\x')).rejects.toThrow(/Not a valid path/)

    await app.api.drives.eject(desktop.id, 'E')
    await expect(app.api.vfs.readFile(desktop.id, 'E:\\a.txt')).rejects.toThrow('Drive E: is not plugged in')
    expect((await app.api.drives.list(desktop.id)).map((d) => d.letter)).toEqual(['C'])
    expect(await app.api.drives.plugIn(desktop.id)).toMatchObject({ letter: 'E', label: expect.any(String) }) // the picker returns the workspace again
    expect(await app.api.vfs.readFile(desktop.id, 'E:\\a.txt')).toBe('A')
  })

  it('removing a desktop stops its agents and deletes C:, chats and rows, but never the real project folder', async () => {
    const folder = await app.api.folders.add(workspace)
    const agent = await app.api.agents.create({ name: 'Fake agent', command: 'node', args: ['--experimental-strip-types', '--no-warnings', fixture], env: {} })
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'keep.txt'), 'keep')
    const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [folder.id] })
    const chat = await app.api.desktop.newChat(desktop.id, agent.id, 'E:\\')
    const sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
    await vi.waitFor(async () => expect(await app.api.sessions.get(sessionId)).toMatchObject({ status: 'idle' }))
    const systemDisk = join(app.vfs.systemRoot(desktop.id))
    expect(existsSync(systemDisk)).toBe(true)

    await app.api.launcher.remove(desktop.id)

    expect(existsSync(systemDisk)).toBe(false)
    expect(existsSync(join(systemDisk, '..'))).toBe(false)
    expect(await app.api.launcher.list()).toEqual([])
    await expect(app.api.sessions.get(sessionId)).rejects.toThrow('Session not found')
    expect(await readFile(join(workspace, 'keep.txt'), 'utf8')).toBe('keep')
    expect(await app.api.folders.list()).toHaveLength(1)
    expect(db.prepare('SELECT COUNT(*) AS n FROM desktop_drives').get()).toEqual({ n: 0 })
  }, 30_000)

  it('a disconnected desktop keeps its chat and its turn running', async () => {
    const session = await createSession()
    const desktopId = session.desktopId!
    app.launcher.connect(desktopId)
    expect((await app.api.launcher.list())[0]).toMatchObject({ id: desktopId, connected: true })
    const turn = app.api.sessions.prompt({ sessionId: session.id, text: 'Write the output file', attachments: [] })
    const requestId = await waitFor(async () => {
      const entry = (await app.api.sessions.transcript(session.id)).find((e) => e.kind === 'tool_call')
      return entry?.kind === 'tool_call' && entry.permission?.outcome === 'pending' ? entry.permission.id : null
    }, 'the permission request')
    expect((await app.api.launcher.list())[0]).toMatchObject({ runState: 'awaiting_approval', pendingApprovals: 1 })

    await app.api.launcher.disconnect(desktopId)
    expect((await app.api.launcher.list())[0]).toMatchObject({ connected: false, runState: 'awaiting_approval', pendingApprovals: 1, chatCount: 1 })
    expect((await app.api.sessions.get(session.id)).status).toBe('awaiting_permission')

    // Approving later (e.g. from a notification) finishes the turn that kept waiting in the background.
    await app.api.sessions.respondPermission(requestId, 'allow')
    await turn
    expect(await readFile(join(workspace, 'fake-agent-output.txt'), 'utf8')).toBe('hello from fake agent\n')
    expect((await app.api.launcher.list())[0]).toMatchObject({ runState: 'idle', pendingApprovals: 0 })

    app.launcher.connect(desktopId)
    expect((await app.api.desktop.policy()).openApps).toBe('allow')
    expect((await app.api.sessions.get(session.id)).status).toBe('idle')
  }, 30_000)
})
