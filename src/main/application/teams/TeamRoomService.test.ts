import { describe, expect, it } from 'vitest'
import type { Id, SessionDto } from '@shared/models'
import type { RoomStateDto } from '@shared/teams'
import { createFixture } from '../../infrastructure/db/test-helpers'
import { SqliteSessionRepository } from '../../infrastructure/db/sqlite-session-repository'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteProfileRepository, SqliteRoomRepository, SqliteTeamRepository } from '../../infrastructure/db/sqlite-team-repositories'
import { RecordingPublisher } from '../test-helpers'
import type { RoomSessions } from './ports'
import { TeamRoomService } from './TeamRoomService'

/** Sessions that answer from a script; each `ask` waits until the test lets it finish. */
class FakeSessions implements RoomSessions {
  names = new Map<Id, string>()
  prompts: { who: string; text: string }[] = []
  cancelled: Id[] = []
  models: string[] = []
  removed: Id[] = []
  answers: Record<string, string[]> = {}
  /** Pending asks by member name, resolved by `finish`. */
  pending: { who: string; done: () => void }[] = []
  holdAnswers = false

  constructor(
    private readonly repo: SqliteSessionRepository,
    private readonly agentId: Id
  ) {}

  get created(): Id[] {
    return [...this.names.keys()]
  }
  async create(desktopId: Id, _agent: Id | undefined, cwd: string, title: string, onCreated: (s: SessionDto) => void): Promise<SessionDto> {
    const session = this.repo.create({ agentId: this.agentId, title, desktopId, cwd, role: 'aside' })
    this.repo.replaceModels(session.id, [{ id: 'opus-id', name: 'Opus', description: null }])
    this.repo.setCurrentModel(session.id, 'sonnet-id')
    this.names.set(session.id, title)
    onCreated(session)
    return this.repo.get(session.id)!
  }
  get(id: Id): SessionDto | null {
    return this.repo.get(id)
  }
  setStatus(id: Id, status: SessionDto['status']): void {
    this.repo.setStatus(id, status)
  }
  async ask(sessionId: Id, text: string): Promise<string> {
    const who = this.names.get(sessionId)!
    this.prompts.push({ who, text })
    if (this.holdAnswers) await new Promise<void>((done) => this.pending.push({ who, done }))
    return this.answers[who]?.shift() ?? ''
  }
  async cancel(id: Id): Promise<void> {
    this.cancelled.push(id)
  }
  async setModel(_id: Id, modelId: string): Promise<void> {
    this.models.push(modelId)
  }
  async remove(id: Id): Promise<void> {
    this.removed.push(id)
    this.repo.remove(id)
  }
  finish(who: string): void {
    const at = this.pending.findIndex((p) => p.who === who)
    this.pending.splice(at, 1)[0].done()
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
}

const setup = () => {
  const f = createFixture()
  const rooms = new SqliteRoomRepository(f.db)
  const profiles = new SqliteProfileRepository(f.db)
  const teams = new SqliteTeamRepository(f.db)
  const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: true })
  const mk = (name: string, model: string | null = null) => profiles.create({ name, instructions: '', agentId: null, model, skillIds: [], mcpServerIds: [], color: '#000' })
  const planner = mk('Planner')
  const coder = mk('Coder', 'opus')
  const reviewer = mk('Reviewer')
  const team = teams.create({ name: 'Crew', instructions: '', skillIds: [], memberIds: [planner.id, coder.id, reviewer.id], boardRef: null })
  const sessions = new FakeSessions(new SqliteSessionRepository(f.db), f.agentId)
  const events = new RecordingPublisher()
  const service = new TeamRoomService({ rooms, teams, profiles, sessions, events })
  const room = service.create(desktop.id, team.id)
  const texts = (): string[] => service.state(room.id).messages.map((m) => `${m.author}: ${m.text}`)
  return { f, service, sessions, events, room, texts, planner, coder, reviewer, rooms, teams, profiles, desktopId: desktop.id }
}

describe('TeamRoomService', () => {
  it('sends a message without a mention to the first member, and posts its answer under its name', async () => {
    const { service, sessions, room, texts } = setup()
    sessions.answers['Planner'] = ['Plan is ready.']
    await service.say(room.id, 'Please plan the login page')
    await settle()
    expect(texts()).toEqual(['You: Please plan the login page', 'Planner: Plan is ready.'])
    expect(sessions.prompts).toHaveLength(1)
    expect(sessions.prompts[0].text).toContain('You: Please plan the login page')
  })

  it('calls the members that are mentioned, all at once, and a bare message then goes to whoever spoke last', async () => {
    const { service, sessions, room, texts } = setup()
    sessions.holdAnswers = true
    sessions.answers['Coder'] = ['Done coding.']
    sessions.answers['Reviewer'] = ['Looks fine.']
    await service.say(room.id, '@Coder and @Reviewer: go')
    await settle()
    // Both are running at the same time: nobody waits for the other.
    expect(sessions.pending.map((p) => p.who).sort()).toEqual(['Coder', 'Reviewer'])
    expect(service.state(room.id).members.map((m) => m.activity)).toEqual(['idle', 'thinking', 'thinking'])
    sessions.finish('Reviewer')
    sessions.finish('Coder')
    await settle()
    expect(texts().slice(1).sort()).toEqual(['Coder: Done coding.', 'Reviewer: Looks fine.'])

    sessions.holdAnswers = false
    const lastSpeaker = service.state(room.id).messages.at(-1)!.author
    sessions.answers['Coder'] = ['Second answer.']
    sessions.answers['Reviewer'] = ['Second review.']
    await service.say(room.id, 'one more thing')
    await settle()
    // The bare message went to exactly one member: the one that spoke last.
    expect(sessions.prompts.slice(2)).toHaveLength(1)
    expect(sessions.prompts[2].who).toBe(lastSpeaker)
  })

  it('lets a member call another one by mentioning it, with no limit set by the room', async () => {
    const { service, sessions, room, texts } = setup()
    sessions.answers['Planner'] = ['@Coder please build it']
    sessions.answers['Coder'] = ['Built. @Reviewer please look']
    sessions.answers['Reviewer'] = ['Approved.']
    await service.say(room.id, 'start')
    await settle()
    expect(texts()).toEqual(['You: start', 'Planner: @Coder please build it', 'Coder: Built. @Reviewer please look', 'Reviewer: Approved.'])
    // The coder was told what the planner said, not its own words.
    expect(sessions.prompts.find((p) => p.who === 'Coder')!.text).toContain('Planner: @Coder please build it')
    expect(sessions.prompts.find((p) => p.who === 'Coder')!.text).not.toContain('Coder: ')
  })

  it('does not call the member that wrote the mention, nor the same member twice for one message', async () => {
    const { service, sessions, room } = setup()
    sessions.holdAnswers = true
    await service.say(room.id, '@Coder one')
    await service.say(room.id, '@Coder two')
    await settle()
    expect(sessions.pending).toHaveLength(1)
    sessions.finish('Coder')
    await settle()
    // The second run hears both messages together; the first already had "one".
    expect(sessions.prompts.map((p) => p.who)).toEqual(['Coder', 'Coder'])
    expect(sessions.prompts[1].text).toContain('You: @Coder two')
    expect(sessions.prompts[1].text).not.toContain('@Coder one')
    sessions.finish('Coder')
    await settle()
  })

  it('opens one session per member, once, with the right links and model', async () => {
    const { service, sessions, room, rooms, coder } = setup()
    await service.say(room.id, '@Coder hi')
    await settle()
    await service.say(room.id, '@Coder again')
    await settle()
    expect([...sessions.names.values()]).toEqual(['Coder'])
    expect(rooms.member(room.id, coder.id)?.sessionId).toBe(sessions.created[0])
    expect(sessions.models).toEqual(['opus-id'])
  })

  it('posts a failure as the member and does not call anyone from it', async () => {
    const { service, sessions, room, texts } = setup()
    sessions.ask = async () => Promise.reject(new Error('agent stopped'))
    await service.say(room.id, '@Coder go')
    await settle()
    expect(texts()).toEqual(['You: @Coder go', 'Coder: I could not answer: agent stopped'])
    expect(service.state(room.id).members.find((m) => m.name === 'Coder')?.activity).toBe('idle')
  })

  it('shows the activity of the session and stops a member', async () => {
    const { service, sessions, room, coder } = setup()
    sessions.holdAnswers = true
    await service.say(room.id, '@Coder go')
    await settle()
    const [sessionId] = sessions.created
    sessions.setStatus(sessionId, 'awaiting_permission')
    expect(service.state(room.id).members.find((m) => m.name === 'Coder')).toMatchObject({ activity: 'waiting', sessionId })
    await service.say(room.id, '@Coder second')
    expect(service.state(room.id).members.find((m) => m.name === 'Coder')?.queued).toBe(1)
    await service.stop(room.id, coder.id)
    expect(sessions.cancelled).toEqual([sessionId])
    expect(service.state(room.id).members.find((m) => m.name === 'Coder')?.queued).toBe(0)
    sessions.finish('Coder')
    await settle()
    expect(sessions.pending).toHaveLength(0) // the queued run was dropped
  })

  it('publishes the room whenever it changes and removes member sessions with the room', async () => {
    const { service, sessions, events, room } = setup()
    await service.say(room.id, '@Coder hello')
    await settle()
    const last = events.payloads('room.changed').at(-1) as RoomStateDto
    expect(last.messages.map((m) => m.author)).toContain('You')
    await service.remove(room.id)
    expect(events.payloads('room.removed')).toEqual([{ id: room.id }])
    expect(sessions.removed).toEqual(sessions.created)
    expect(sessions.removed).toHaveLength(1)
    expect(() => service.state(room.id)).toThrow(/not found/)
  })

  it('refuses a room for a team without members, and an empty message', async () => {
    const { service, teams, desktopId, room } = setup()
    const empty = teams.create({ name: 'Empty', instructions: '', skillIds: [], memberIds: [], boardRef: null })
    expect(() => service.create(desktopId, empty.id)).toThrow(/no members/)
    await expect(service.say(room.id, '   ')).rejects.toThrow(/Nothing to send/)
  })
})
