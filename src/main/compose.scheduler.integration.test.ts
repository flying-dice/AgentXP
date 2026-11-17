import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, newTaskInput, type ScheduledTaskDto } from '@shared/scheduler'
import { composeApp, type AppServices } from './compose'
import { RecordingPublisher } from './application/test-helpers'
import { openDatabase } from './infrastructure/db/open-database'

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'infrastructure', 'acp', '__fixtures__', 'fake-agent.ts')

let workspace: string
let app: AppServices
let publisher: RecordingPublisher
let db: ReturnType<typeof openDatabase>

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'a7-sched-')))
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

async function waitFor<T>(read: () => Promise<T | undefined | null | false> | T | undefined | null | false, what: string): Promise<T> {
  const deadline = Date.now() + 15_000
  for (;;) {
    const value = await read()
    if (value) return value
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 25))
  }
}

/** A desktop with the project plugged in, the fake agent, and a task that runs it with a prompt (run on demand only). */
async function createTask(): Promise<{ desktopId: number; task: ScheduledTaskDto }> {
  const folder = await app.api.folders.add(workspace)
  const agent = await app.api.agents.create({ name: 'Fake agent', command: 'node', args: ['--experimental-strip-types', '--no-warnings', fixture], env: {} })
  const desktop = await app.api.launcher.create({ title: 'Project', folderIds: [folder.id] })
  // The fake agent writes a file and runs a command: those need the apps that provide them.
  await app.api.desktop.openWindow({ desktopId: desktop.id, app: 'code' })
  await app.api.desktop.openWindow({ desktopId: desktop.id, app: 'terminal' })
  const policy = await app.api.desktop.policy()
  await app.api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow', 'fs.write': 'allow' } })
  const input = { ...newTaskInput('E:\\'), name: 'Nightly review', settings: { ...DEFAULT_SETTINGS, stopIfRunsLonger: false } }
  input.actions = [{ kind: 'agent', agentId: agent.id, cwd: 'E:\\', session: 'new', sessionId: null, prompt: 'Write the output file' }]
  return { desktopId: desktop.id, task: await app.api.scheduler.create(desktop.id, input) }
}

describe('Task Scheduler with the fake ACP agent', () => {
  it('Run starts a chat in the project, sends the prompt, and the history says the run completed', async () => {
    const { desktopId, task } = await createTask()
    expect(task).toMatchObject({ status: 'ready', nextRunAt: null, lastRun: null })
    await app.api.scheduler.run(task.id)

    const running = await waitFor(async () => (await app.api.scheduler.history(task.id)).find((r) => r.sessionId !== null), 'the chat of the run')
    expect(running).toMatchObject({ result: 'running', startedBy: 'manual' })
    const chat = await app.api.sessions.get(running.sessionId!)
    expect(chat).toMatchObject({ desktopId, cwd: 'E:\\' })
    expect(chat.title).toMatch(/^Nightly review - /)

    const permission = await waitFor(async () => {
      const entries = await app.api.sessions.transcript(chat.id)
      return entries.find((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending')
    }, 'the permission request')
    expect((await app.api.scheduler.list(desktopId))[0].status).toBe('running')
    await app.api.sessions.respondPermission(permission.kind === 'tool_call' ? permission.permission!.id : 0, 'allow')

    const done = await waitFor(async () => (await app.api.scheduler.history(task.id)).find((r) => r.result !== 'running'), 'the end of the run')
    expect(done).toMatchObject({ result: 'success', message: 'The agent finished its turn.', sessionId: chat.id })
    expect((await app.api.scheduler.list(desktopId))[0]).toMatchObject({ status: 'ready', lastRun: { result: 'success' } })
    expect(publisher.names()).toContain('scheduler.changed')

    const events = app.eventLog.query({ desktopId, source: 'scheduler' })
    expect(events.map((e) => e.name)).toEqual(['task/created', 'task/started', 'task/completed'])
  }, 30_000)

  it('End stops the turn that waits for a permission, and the run is stopped', async () => {
    const { desktopId, task } = await createTask()
    await app.api.scheduler.run(task.id)
    const running = await waitFor(async () => (await app.api.scheduler.history(task.id)).find((r) => r.sessionId !== null), 'the chat of the run')
    await waitFor(async () => (await app.api.sessions.transcript(running.sessionId!)).find((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending'), 'the permission request')
    await app.api.scheduler.end(task.id)
    const done = await waitFor(async () => (await app.api.scheduler.history(task.id)).find((r) => r.result !== 'running'), 'the end of the run')
    expect(done).toMatchObject({ result: 'stopped', message: 'The task was ended by the user.' })
    expect(app.eventLog.query({ desktopId, source: 'scheduler' }).at(-1)).toMatchObject({ name: 'task/stopped', level: 'warning' })
  }, 30_000)

  it('deleting the desktop deletes its tasks', async () => {
    const { desktopId, task } = await createTask()
    await app.api.launcher.remove(desktopId)
    await expect(app.api.scheduler.history(task.id)).rejects.toThrow(/Task not found/)
  }, 30_000)
})
