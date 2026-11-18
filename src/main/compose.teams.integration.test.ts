import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RoomStateDto } from '@shared/teams'
import { composeApp, type AppServices } from './compose'
import { FakeConnector, RecordingPublisher } from './application/test-helpers'
import { openDatabase } from './infrastructure/db/open-database'

let workspace: string
let app: AppServices
let publisher: RecordingPublisher
let connector: FakeConnector
let db: ReturnType<typeof openDatabase>

beforeEach(async () => {
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'a7-teams-')))
  db = openDatabase(':memory:')
  publisher = new RecordingPublisher()
  connector = new FakeConnector()
  app = composeApp({
    teamsEnabled: true,
    db,
    publisher,
    connector,
    picker: { pickFolder: async () => workspace },
    saver: { saveText: async () => null },
    opener: { open: async () => {} },
    a2uiMcp: { electronPath: process.execPath, scriptPath: join(workspace, 'a2ui-mcp.js') },
    skillsDir: join(workspace, 'skills'),
    mcpProber: { listTools: async () => [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }] },
    mcpProxy: { electronPath: 'electron', scriptPath: 'mcp-proxy.js' }
  })
  await app.start()
})

afterEach(async () => {
  await app.shutdown()
  db.close()
  await rm(workspace, { recursive: true, force: true })
})

const settle = async (until: () => boolean): Promise<void> => {
  const deadline = Date.now() + 5000
  while (!until()) {
    if (Date.now() > deadline) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 10))
  }
}

describe('skills and MCP servers reach the agent', () => {
  it('gives a plain chat the briefing and the enabled servers, and hides switched-off tools through the proxy', async () => {
    const skillDir = join(workspace, 'src-skill')
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: tidy\ndescription: Keep the code tidy\n---\nRules')
    const skill = await app.api.skills.install(skillDir)
    expect(skill.path).toBe(join(workspace, 'skills', 'tidy'))

    const server = await app.api.mcp.add({ name: 'docs', transport: 'http', command: '', args: [], url: 'https://docs.test/mcp', vars: [{ key: 'Authorization', value: 'Bearer x', secret: true }] })
    expect((await app.api.mcp.test(server.id)).tools.map((t) => t.name)).toEqual(['a', 'b'])
    await app.api.mcp.setToolEnabled(server.id, 'b', false)

    const folder = await app.api.folders.add(workspace)
    const agent = await app.api.agents.create({ name: 'Fake', command: 'node', args: [], env: {} })
    const desktop = await app.api.launcher.create({ title: 'P', folderIds: [folder.id] })
    const session = await app.api.sessions.create(desktop.id, agent.id, 'E:\\')
    expect(connector.connections[0].mcpServers.map((s) => s.name)).toContain('docs')
    const docs = connector.connections[0].mcpServers.find((s) => s.name === 'docs')
    expect(docs).toMatchObject({ kind: 'stdio', command: 'electron', args: ['mcp-proxy.js'] })

    await app.api.sessions.prompt({ sessionId: session.id, text: 'hello', attachments: [] })
    const blocks = connector.connections[0].prompts[0]
    expect(blocks[0]).toMatchObject({ kind: 'resource', uri: 'agentxp://briefing' })
    expect(blocks[0].kind === 'resource' && blocks[0].text).toContain('tidy: Keep the code tidy')
    // The briefing is plumbing: the transcript the user sees has only what they typed.
    await app.api.sessions.prompt({ sessionId: session.id, text: 'again', attachments: [] })
    expect(connector.connections[0].prompts[1].some((b) => b.kind === 'resource' && b.uri === 'agentxp://briefing')).toBe(false)
  })
})

describe('a team room', () => {
  it('runs every member as its own session with its own briefing and posts the answers in the room', async () => {
    const folder = await app.api.folders.add(workspace)
    const agent = await app.api.agents.create({ name: 'Fake', command: 'node', args: [], env: {} })
    const desktop = await app.api.launcher.create({ title: 'P', folderIds: [folder.id] })
    await app.api.agents.setDefault(agent.id)
    const planner = await app.api.profiles.create({ name: 'Planner', instructions: 'Plan work.', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
    const coder = await app.api.profiles.create({ name: 'Coder', instructions: 'Write code.', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
    const team = await app.api.teams.create({ name: 'Crew', instructions: 'Be brief.', skillIds: [], memberIds: [planner.id, coder.id], boardRef: null })
    const room = await app.api.rooms.create(desktop.id, team.id, 'E:\\')

    await app.api.rooms.say(room.id, '@Coder ship it')
    await settle(() => connector.connections.length === 1)
    await settle(() => connector.connections[0].prompts.length === 1)
    const state = (await app.api.rooms.state(room.id)) as RoomStateDto
    expect(state.members.map((m) => m.name)).toEqual(['Planner', 'Coder'])
    const prompt = connector.connections[0].prompts[0]
    expect(prompt[0]).toMatchObject({ kind: 'resource', uri: 'agentxp://briefing' })
    const briefing = prompt[0].kind === 'resource' ? (prompt[0].text ?? '') : ''
    expect(briefing).toContain('You are Coder')
    expect(briefing).toContain('Be brief.')
    expect(briefing).toContain('Write code.')
    expect(prompt.find((b) => b.kind === 'text')).toMatchObject({ text: expect.stringContaining('You: @Coder ship it') })
    // Member sessions are `aside` sessions: the chat lists do not show them.
    const members = (await app.api.sessions.list(desktop.id)).filter((s) => s.title === 'Coder')
    expect(members).toHaveLength(1)
    expect(members[0].role).toBe('aside')
  })
})
