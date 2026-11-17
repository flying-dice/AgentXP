import { describe, expect, it } from 'vitest'
import { createFixture } from '../../infrastructure/db/test-helpers'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteMcpServerRepository } from '../../infrastructure/db/sqlite-mcp-server-repository'
import { SqliteSessionRepository } from '../../infrastructure/db/sqlite-session-repository'
import { SqliteSkillRepository } from '../../infrastructure/db/sqlite-skill-repository'
import { SqliteProfileRepository, SqliteRoomRepository, SqliteTeamRepository } from '../../infrastructure/db/sqlite-team-repositories'
import { AgentCapabilities, ENV_PROXY_HIDE, ENV_PROXY_TARGET } from './AgentCapabilities'

const setup = (proxy = true) => {
  const f = createFixture()
  const repos = {
    skills: new SqliteSkillRepository(f.db),
    servers: new SqliteMcpServerRepository(f.db),
    profiles: new SqliteProfileRepository(f.db),
    teams: new SqliteTeamRepository(f.db),
    rooms: new SqliteRoomRepository(f.db),
    sessions: new SqliteSessionRepository(f.db)
  }
  const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: true })
  const caps = new AgentCapabilities({ ...repos, proxy: proxy ? { electronPath: 'electron', scriptPath: 'mcp-proxy.js' } : undefined })
  const chat = repos.sessions.create({ agentId: f.agentId, title: 'chat', desktopId: desktop.id })
  const skill = (name: string, enabled = true) => {
    const s = repos.skills.add({ name, description: `${name} skill`, path: `/s/${name}` })
    repos.skills.setEnabled(s.id, enabled)
    return s
  }
  const server = (name: string) => repos.servers.create({ name, transport: 'stdio', command: 'node', args: ['s.js'], url: '', vars: [{ key: 'K', value: 'v', secret: false }] })
  return { f, repos, desktop, caps, chat, skill, server }
}

describe('a plain chat', () => {
  it('gets every enabled skill and server', () => {
    const { repos, caps, chat, skill, server } = setup()
    skill('pdf')
    skill('off', false)
    server('github')
    const disabled = server('disabled')
    repos.servers.setEnabled(disabled.id, false)
    expect(caps.mcpServers(chat.id).map((s) => s.name)).toEqual(['github'])
    const briefing = caps.briefing(chat.id)
    expect(briefing).toContain('pdf: pdf skill (read /s/pdf/SKILL.md')
    expect(briefing).not.toContain('off skill')
    expect(briefing).not.toContain('team')
  })

  it('has no briefing when nothing is installed, and a review gets nothing', () => {
    const { repos, caps, chat, skill, f, desktop } = setup()
    expect(caps.briefing(chat.id)).toBeNull()
    skill('pdf')
    const review = repos.sessions.create({ agentId: f.agentId, title: 'r', desktopId: desktop.id, role: 'review' })
    expect(caps.briefing(review.id)).toBeNull()
    expect(caps.mcpServers(review.id)).toEqual([])
  })

  it('hands a server with switched-off tools over through the proxy', () => {
    const { repos, caps, chat, server } = setup()
    const s = server('github')
    repos.servers.saveTest(s.id, { ok: true, message: 'ok', at: '' }, [{ name: 'a', description: '' }, { name: 'b', description: '' }])
    expect(caps.mcpServers(chat.id)[0]).toMatchObject({ kind: 'stdio', command: 'node' })
    repos.servers.setToolEnabled(s.id, 'b', false)
    const [proxied] = caps.mcpServers(chat.id)
    expect(proxied).toMatchObject({ kind: 'stdio', name: 'github', command: 'electron', args: ['mcp-proxy.js'] })
    const env = (proxied as { env: Record<string, string> }).env
    expect(JSON.parse(env[ENV_PROXY_HIDE])).toEqual(['b'])
    expect(JSON.parse(env[ENV_PROXY_TARGET])).toMatchObject({ kind: 'stdio', command: 'node', env: { K: 'v' } })
  })

  it('hands it over whole without a proxy', () => {
    const { repos, caps, chat, server } = setup(false)
    const s = server('github')
    repos.servers.saveTest(s.id, { ok: true, message: 'ok', at: '' }, [{ name: 'a', description: '' }])
    repos.servers.setToolEnabled(s.id, 'a', false)
    expect(caps.mcpServers(chat.id)[0]).toMatchObject({ command: 'node' })
  })
})

describe('a member of a team room', () => {
  it('gets its own and its team skills, its own servers, and the instructions of both', () => {
    const { repos, caps, f, desktop, skill, server } = setup()
    const own = skill('own')
    const shared = skill('shared')
    skill('other')
    const mine = server('mine')
    server('theirs')
    const coder = repos.profiles.create({ name: 'Coder', instructions: 'Write code.', agentId: null, model: null, skillIds: [own.id], mcpServerIds: [mine.id], color: '#000' })
    const reviewer = repos.profiles.create({ name: 'Code Reviewer', instructions: 'Review.', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000' })
    const team = repos.teams.create({ name: 'Crew', instructions: 'Be brief.', skillIds: [shared.id], memberIds: [coder.id, reviewer.id], boardRef: 'sprint-1' })
    const room = repos.rooms.create({ desktopId: desktop.id, teamId: team.id, title: 'Crew room', cwd: 'C:\\Agent' })
    const session = repos.sessions.create({ agentId: f.agentId, title: 'Coder', desktopId: desktop.id, role: 'aside' })
    repos.rooms.ensureMember(room.id, coder.id)
    repos.rooms.setMemberSession(room.id, coder.id, session.id)

    expect(caps.mcpServers(session.id).map((s) => s.name)).toEqual(['mine'])
    const text = caps.briefing(session.id) ?? ''
    expect(text).toContain('You are Coder, a member of the team "Crew" in the chat room "Crew room"')
    expect(text).toContain('Be brief.')
    expect(text).toContain('Write code.')
    expect(text).toContain('@Coder, @CodeReviewer')
    expect(text).toContain('sprint-1')
    expect(text).toContain('- own:')
    expect(text).toContain('- shared:')
    expect(text).not.toContain('- other:')
  })
})
