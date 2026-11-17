/** In-memory skills, MCP servers, profiles, teams and rooms for Storybook (`createFakeApi`) and the renderer tests. */
import type { Agent7Api, Agent7Events } from '@shared/ipc'
import {
  colorOfName,
  mentionedMembers,
  type McpServerDto,
  type McpServerInput,
  type ProfileDto,
  type RoomDto,
  type RoomMemberDto,
  type RoomMessageDto,
  type RoomStateDto,
  type SkillDto,
  type TeamDto
} from '@shared/teams'

export const sampleSkills: SkillDto[] = [
  { id: 1, name: 'pdf', description: 'Read, merge and fill PDF files.', path: 'C:\\skills\\pdf', enabled: true, installedAt: '2026-11-10T09:00:00.000Z' },
  { id: 2, name: 'review-checklist', description: 'The checklist a reviewer walks through before approving a change.', path: 'C:\\skills\\review-checklist', enabled: true, installedAt: '2026-11-12T10:30:00.000Z' },
  { id: 3, name: 'release-notes', description: 'Write release notes from merged pull requests.', path: 'C:\\skills\\release-notes', enabled: false, installedAt: '2026-11-14T16:45:00.000Z' }
]

export const sampleMcpServers: McpServerDto[] = [
  {
    id: 1,
    name: 'github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    url: '',
    vars: [{ key: 'GITHUB_TOKEN', value: 'ghp_example', secret: true }],
    enabled: true,
    tools: [
      { name: 'create_issue', description: 'Open an issue', enabled: true },
      { name: 'merge_pull_request', description: 'Merge a pull request', enabled: false },
      { name: 'search_code', description: 'Search code in repositories', enabled: true }
    ],
    lastTest: { ok: true, message: 'Connected. 3 tools.', at: '2026-11-16T08:00:00.000Z' }
  },
  { id: 2, name: 'docs', transport: 'http', command: '', args: [], url: 'https://docs.example.com/mcp', vars: [], enabled: true, tools: [], lastTest: null }
]

const profile = (id: number, name: string, instructions: string, skillIds: number[] = [], mcpServerIds: number[] = []): ProfileDto => ({ id, name, instructions, agentId: null, model: null, skillIds, mcpServerIds, color: colorOfName(name) })

export const sampleProfiles: ProfileDto[] = [
  profile(1, 'Planner', 'You break the work into small tasks and hand each one to a teammate with an @mention.'),
  profile(2, 'Coder', 'You implement the task you are given and say what you changed. Ask @Reviewer to look at it when it is done.', [], [1]),
  profile(3, 'Reviewer', 'You review changes for bugs and for tests that are missing. Be short and specific.', [2])
]

export const sampleTeams: TeamDto[] = [{ id: 1, name: 'Feature team', instructions: 'We build one change at a time. Keep messages short.', skillIds: [1], memberIds: [1, 2, 3], boardRef: null }]

const hasName = (list: readonly { id: number; name: string }[], name: string, except?: number): boolean => list.some((x) => x.id !== except && x.name.toLowerCase() === name.toLowerCase())

export interface FakeTeams {
  api: Pick<Agent7Api, 'skills' | 'mcp' | 'profiles' | 'teams' | 'rooms'>
  /** Wire the room events to the fake API's `on` (the room window listens to `room.changed`). */
  onRoomEvents(emit: <K extends 'room.changed' | 'room.removed'>(event: K, payload: Agent7Events[K]) => void): void
}

export function createFakeTeams(): FakeTeams {
  let skills = sampleSkills.map((s) => ({ ...s }))
  let servers = sampleMcpServers.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t })) }))
  let profiles = sampleProfiles.map((p) => ({ ...p }))
  let teams = sampleTeams.map((t) => ({ ...t }))
  // One sample room (id 1) so the Team Chat story and the Chat rooms tab have something to show.
  let rooms: RoomDto[] = [{ id: 1, desktopId: 1, teamId: 1, title: 'Feature team', cwd: 'E:\\src', createdAt: '2025-01-01T09:00:00.000Z' }]
  const at = (m: number): string => `2025-01-01T09:0${m}:00.000Z`
  const messages = new Map<number, RoomMessageDto[]>([
    [
      1,
      [
        { id: 1, roomId: 1, profileId: null, author: 'You', text: '@Planner split the login redirect fix into steps, then @Coder starts.', createdAt: at(0) },
        { id: 2, roomId: 1, profileId: 1, author: 'Planner', text: 'Two steps: 1) keep the return URL when the session expires, 2) test the redirect. @Coder please take step 1.', createdAt: at(1) },
        { id: 3, roomId: 1, profileId: 2, author: 'Coder', text: 'Step 1 is done in src/auth/redirect.ts. @Reviewer please check it.', createdAt: at(3) }
      ]
    ]
  ])
  const busy = new Map<string, boolean>()
  let nextId = 100
  let emit: Parameters<FakeTeams['onRoomEvents']>[0] = () => {}

  const membersOf = (team: TeamDto): ProfileDto[] => team.memberIds.flatMap((id) => profiles.find((p) => p.id === id) ?? [])
  const state = (roomId: number): RoomStateDto => {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) throw new Error('Room not found')
    const members: RoomMemberDto[] = membersOf(teams.find((t) => t.id === room.teamId)!).map((p) => ({
      profileId: p.id,
      name: p.name,
      color: p.color,
      sessionId: null,
      activity: busy.get(`${roomId}:${p.id}`) ? 'thinking' : 'idle',
      queued: 0
    }))
    return { room, members, messages: messages.get(roomId) ?? [] }
  }
  const publish = (roomId: number): void => emit('room.changed', state(roomId))
  const post = (roomId: number, profileId: number | null, author: string, text: string): void => {
    const list = messages.get(roomId) ?? []
    list.push({ id: nextId++, roomId, profileId, author, text, createdAt: new Date().toISOString() })
    messages.set(roomId, list)
    publish(roomId)
  }
  /** A member answers after a moment (Storybook only): it shows "thinking…" meanwhile. */
  const reply = (roomId: number, member: ProfileDto): void => {
    busy.set(`${roomId}:${member.id}`, true)
    publish(roomId)
    setTimeout(() => {
      busy.set(`${roomId}:${member.id}`, false)
      if (rooms.some((r) => r.id === roomId)) post(roomId, member.id, member.name, `Understood. I will take it from here.`)
    }, 1200)
  }

  const api: FakeTeams['api'] = {
    skills: {
      list: async () => skills,
      install: async (path) => {
        const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? 'skill'
        if (hasName(skills, name)) throw new Error(`A skill named "${name}" is installed already.`)
        const skill: SkillDto = { id: nextId++, name, description: 'A skill installed from a folder.', path, enabled: true, installedAt: new Date().toISOString() }
        skills = [...skills, skill]
        return skill
      },
      remove: async (id) => void (skills = skills.filter((s) => s.id !== id)),
      setEnabled: async (id, enabled) => void (skills = skills.map((s) => (s.id === id ? { ...s, enabled } : s)))
    },
    mcp: {
      list: async () => servers,
      add: async (input: McpServerInput) => {
        if (hasName(servers, input.name)) throw new Error(`A server named "${input.name}" is installed already.`)
        const server: McpServerDto = { id: nextId++, ...input, enabled: true, tools: [], lastTest: null }
        servers = [...servers, server]
        return server
      },
      update: async (id, input) => {
        servers = servers.map((s) => (s.id === id ? { ...s, ...input } : s))
        return servers.find((s) => s.id === id)!
      },
      remove: async (id) => void (servers = servers.filter((s) => s.id !== id)),
      setEnabled: async (id, enabled) => void (servers = servers.map((s) => (s.id === id ? { ...s, enabled } : s))),
      test: async (id) => {
        const tools = [{ name: 'ping', description: 'Check the server', enabled: true }]
        servers = servers.map((s) => (s.id === id ? { ...s, tools: s.tools.length ? s.tools : tools, lastTest: { ok: true, message: `Connected. ${(s.tools.length || 1)} tools.`, at: new Date().toISOString() } } : s))
        return servers.find((s) => s.id === id)!
      },
      probe: async (input) => (input.name === 'broken' ? { ok: false, message: 'Could not connect: spawn broken ENOENT', at: new Date().toISOString() } : { ok: true, message: 'Connected. 1 tool.', at: new Date().toISOString() }),
      setToolEnabled: async (id, tool, enabled) => void (servers = servers.map((s) => (s.id === id ? { ...s, tools: s.tools.map((t) => (t.name === tool ? { ...t, enabled } : t)) } : s)))
    },
    profiles: {
      list: async () => profiles,
      create: async (input) => {
        if (hasName(profiles, input.name)) throw new Error(`A profile named "${input.name}" exists already.`)
        const created: ProfileDto = { ...input, id: nextId++, color: input.color ?? colorOfName(input.name) }
        profiles = [...profiles, created]
        return created
      },
      update: async (id, input) => {
        profiles = profiles.map((p) => (p.id === id ? { ...p, ...input, color: input.color ?? p.color } : p))
        return profiles.find((p) => p.id === id)!
      },
      remove: async (id) => {
        profiles = profiles.filter((p) => p.id !== id)
        teams = teams.map((t) => ({ ...t, memberIds: t.memberIds.filter((m) => m !== id) }))
      }
    },
    teams: {
      list: async () => teams,
      create: async (input) => {
        if (hasName(teams, input.name)) throw new Error(`A team named "${input.name}" exists already.`)
        const created: TeamDto = { ...input, id: nextId++ }
        teams = [...teams, created]
        return created
      },
      update: async (id, input) => {
        teams = teams.map((t) => (t.id === id ? { ...t, ...input } : t))
        return teams.find((t) => t.id === id)!
      },
      remove: async (id) => void (teams = teams.filter((t) => t.id !== id))
    },
    rooms: {
      list: async (desktopId) => rooms.filter((r) => r.desktopId === desktopId),
      create: async (desktopId, teamId, cwd = 'C:\\Agent') => {
        const team = teams.find((t) => t.id === teamId)
        if (!team) throw new Error('Team not found')
        if (team.memberIds.length === 0) throw new Error(`The team "${team.name}" has no members yet.`)
        const room: RoomDto = { id: nextId++, desktopId, teamId, title: team.name, cwd, createdAt: new Date().toISOString() }
        rooms = [room, ...rooms]
        return room
      },
      state: async (roomId) => state(roomId),
      remove: async (roomId) => {
        rooms = rooms.filter((r) => r.id !== roomId)
        emit('room.removed', { id: roomId })
      },
      rename: async (roomId, title) => {
        rooms = rooms.map((r) => (r.id === roomId ? { ...r, title } : r))
        publish(roomId)
      },
      say: async (roomId, text) => {
        const members = state(roomId).members
        const called = mentionedMembers(text, members)
        post(roomId, null, 'You', text)
        const target = called.length ? called : members.slice(0, 1)
        for (const m of target) reply(roomId, profiles.find((p) => p.id === m.profileId)!)
      },
      stop: async (roomId, profileId) => {
        busy.set(`${roomId}:${profileId}`, false)
        publish(roomId)
      }
    }
  }
  return { api, onRoomEvents: (fn) => (emit = fn) }
}
