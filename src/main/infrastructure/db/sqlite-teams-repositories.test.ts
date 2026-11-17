import { describe, expect, it } from 'vitest'
import { count, createFixture } from './test-helpers'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteMcpServerRepository } from './sqlite-mcp-server-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteSkillRepository } from './sqlite-skill-repository'
import { SqliteProfileRepository, SqliteRoomRepository, SqliteTeamRepository } from './sqlite-team-repositories'

describe('skills', () => {
  it('adds, switches and removes', () => {
    const repo = new SqliteSkillRepository(createFixture().db)
    const skill = repo.add({ name: 'pdf', description: 'PDFs', path: '/s/pdf' })
    expect(skill).toMatchObject({ name: 'pdf', enabled: true })
    expect(repo.getByName('PDF')?.id).toBe(skill.id)
    repo.setEnabled(skill.id, false)
    expect(repo.get(skill.id)?.enabled).toBe(false)
    expect(() => repo.add({ name: 'pdf', description: 'x', path: '/other' })).toThrow()
    expect(repo.remove(skill.id)).toBe(true)
    expect(repo.list()).toEqual([])
  })
})

describe('MCP servers', () => {
  const input = { name: 'github', transport: 'stdio' as const, command: 'npx', args: ['-y', 'x'], url: '', vars: [{ key: 'TOKEN', value: 's3', secret: true }] }

  it('keeps arguments, variables and the tools of the last test with their switches', () => {
    const repo = new SqliteMcpServerRepository(createFixture().db)
    const server = repo.create(input)
    expect(server).toMatchObject({ args: ['-y', 'x'], vars: [{ key: 'TOKEN', value: 's3', secret: true }], tools: [], lastTest: null })
    repo.saveTest(server.id, { ok: true, message: 'Connected. 2 tools.', at: '2026-01-01T00:00:00.000Z' }, [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }])
    repo.setToolEnabled(server.id, 'b', false)
    const again = repo.saveTest(server.id, { ok: true, message: 'Connected. 3 tools.', at: '2026-01-02T00:00:00.000Z' }, [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }, { name: 'c', description: 'C' }])
    expect(again?.tools.map((t) => [t.name, t.enabled])).toEqual([['a', true], ['b', false], ['c', true]])
    expect(again?.lastTest).toMatchObject({ ok: true, message: 'Connected. 3 tools.' })
    // A failed test keeps the tools.
    expect(repo.saveTest(server.id, { ok: false, message: 'no', at: '2026-01-03T00:00:00.000Z' }, null)?.tools).toHaveLength(3)
  })

  it('updates in place and cascades on delete', () => {
    const f = createFixture()
    const repo = new SqliteMcpServerRepository(f.db)
    const server = repo.create(input)
    const updated = repo.update(server.id, { ...input, name: 'gh', args: [], vars: [] })
    expect(updated).toMatchObject({ name: 'gh', args: [], vars: [] })
    repo.remove(server.id)
    expect(count(f.db, 'mcp_server_args')).toBe(0)
    expect(count(f.db, 'mcp_server_vars')).toBe(0)
  })
})

describe('profiles, teams and rooms', () => {
  const setup = () => {
    const f = createFixture()
    const skills = new SqliteSkillRepository(f.db)
    const servers = new SqliteMcpServerRepository(f.db)
    const profiles = new SqliteProfileRepository(f.db)
    const teams = new SqliteTeamRepository(f.db)
    const rooms = new SqliteRoomRepository(f.db)
    const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: true })
    return { f, skills, servers, profiles, teams, rooms, desktopId: desktop.id }
  }

  it('links a profile to skills and servers and forgets them when those go', () => {
    const { skills, servers, profiles } = setup()
    const skill = skills.add({ name: 's', description: 'd', path: '/s' })
    const server = servers.create({ name: 'm', transport: 'http', command: '', args: [], url: 'https://x.test', vars: [] })
    const profile = profiles.create({ name: 'Coder', instructions: 'Code', agentId: null, model: 'opus', skillIds: [skill.id], mcpServerIds: [server.id], color: '#123456' })
    expect(profile).toMatchObject({ skillIds: [skill.id], mcpServerIds: [server.id], model: 'opus' })
    skills.remove(skill.id)
    servers.remove(server.id)
    expect(profiles.get(profile.id)).toMatchObject({ skillIds: [], mcpServerIds: [] })
  })

  it('keeps the member order of a team', () => {
    const { profiles, teams } = setup()
    const mk = (name: string) => profiles.create({ name, instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000' }).id
    const [a, b, c] = [mk('A'), mk('B'), mk('C')]
    const team = teams.create({ name: 'T', instructions: 'team', skillIds: [], memberIds: [c, a, b], boardRef: 'board-1' })
    expect(team.memberIds).toEqual([c, a, b])
    expect(team.boardRef).toBe('board-1')
    profiles.remove(a)
    expect(teams.get(team.id)?.memberIds).toEqual([c, b])
  })

  it('stores a room with its messages and member sessions', () => {
    const { f, profiles, teams, rooms, desktopId } = setup()
    const p = profiles.create({ name: 'A', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000' })
    const team = teams.create({ name: 'T', instructions: '', skillIds: [], memberIds: [p.id], boardRef: null })
    const room = rooms.create({ desktopId, teamId: team.id, title: 'T', cwd: 'C:\\Agent' })
    rooms.addMessage({ roomId: room.id, profileId: null, author: 'You', text: 'hi' })
    rooms.addMessage({ roomId: room.id, profileId: p.id, author: 'A', text: 'hello' })
    expect(rooms.messages(room.id).map((m) => m.text)).toEqual(['hi', 'hello'])
    const session = new SqliteSessionRepository(f.db).create({ agentId: f.agentId, title: 'A', desktopId, role: 'aside' })
    rooms.ensureMember(room.id, p.id)
    rooms.setMemberSession(room.id, p.id, session.id)
    rooms.setMemberSeen(room.id, p.id, 2)
    expect(rooms.member(room.id, p.id)).toMatchObject({ sessionId: session.id, lastSeenId: 2 })
    expect(rooms.findBySession(session.id)).toEqual({ roomId: room.id, profileId: p.id })
    new SqliteSessionRepository(f.db).remove(session.id)
    expect(rooms.member(room.id, p.id)?.sessionId).toBeNull()
    rooms.remove(room.id)
    expect(count(f.db, 'room_messages')).toBe(0)
    expect(count(f.db, 'room_members')).toBe(0)
  })
})
