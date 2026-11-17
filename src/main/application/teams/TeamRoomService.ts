import type { Id, SessionDto, SessionStatus } from '@shared/models'
import { AGENT_HOME } from '@shared/vfs'
import { mentionedMembers, type MemberActivity, type ProfileDto, type RoomDto, type RoomMessageDto, type RoomMemberDto, type RoomStateDto, type TeamDto } from '@shared/teams'
import type { ProfileRepository, RoomRepository, TeamRepository } from '../../domain/repositories/teams-repositories'
import { AppError, required } from '../errors'
import type { EventPublisher } from '../ports'
import type { RoomSessions } from './ports'

/** How a member's work is going: the queue behind it and whether it is running now. */
interface MemberRun {
  running: boolean
  queued: number
  /** Raised by Stop: what was queued before it is dropped. */
  generation: number
  tail: Promise<void>
}

const ACTIVITY: Partial<Record<SessionStatus, MemberActivity>> = { connecting: 'starting', working: 'thinking', awaiting_permission: 'waiting', error: 'error' }

/**
 * Team chat rooms: a chat room where every member of a team is its own ACP session. The user or a member calls another
 * with an @mention and the one called starts at once, so several can work at the same time. A message without a
 * mention goes to the member who spoke last (the first member when nobody has). There is no coordinator and no
 * turn limit: the room is plumbing, behaviour is up to the instructions of the profiles.
 */
export class TeamRoomService {
  private readonly runs = new Map<string, MemberRun>()

  constructor(
    private readonly deps: {
      rooms: RoomRepository
      teams: TeamRepository
      profiles: ProfileRepository
      sessions: RoomSessions
      events: EventPublisher
    }
  ) {}

  list(desktopId: Id): RoomDto[] {
    return this.deps.rooms.list(desktopId)
  }

  create(desktopId: Id, teamId: Id, cwd: string = AGENT_HOME): RoomDto {
    const team = required(this.deps.teams.get(teamId), 'Team')
    if (this.membersOf(team).length === 0) throw new AppError(`The team "${team.name}" has no members yet. Add a profile to it first.`)
    return this.deps.rooms.create({ desktopId, teamId, title: team.name, cwd })
  }

  state(roomId: Id): RoomStateDto {
    const room = required(this.deps.rooms.get(roomId), 'Room')
    const team = required(this.deps.teams.get(room.teamId), 'Team')
    return { room, members: this.membersOf(team).map((p) => this.memberDto(room, p)), messages: this.deps.rooms.messages(roomId) }
  }

  rename(roomId: Id, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) throw new AppError('The room needs a title')
    required(this.deps.rooms.get(roomId), 'Room')
    this.deps.rooms.rename(roomId, trimmed)
    this.publish(roomId)
  }

  async remove(roomId: Id): Promise<void> {
    required(this.deps.rooms.get(roomId), 'Room')
    const sessionIds = this.deps.rooms.members(roomId).flatMap((m) => (m.sessionId === null ? [] : [m.sessionId]))
    for (const [key, run] of this.runs) if (key.startsWith(`${roomId}:`)) run.generation++
    this.deps.rooms.remove(roomId)
    for (const key of [...this.runs.keys()]) if (key.startsWith(`${roomId}:`)) this.runs.delete(key)
    this.deps.events.publish('room.removed', { id: roomId })
    await Promise.all(sessionIds.map((id) => this.deps.sessions.remove(id).catch(() => {})))
  }

  /** The user speaks (or an agent from another chat, under `author`). Stored at once; the members called answer on their own. */
  async say(roomId: Id, text: string, author = 'You'): Promise<void> {
    const body = text.trim()
    if (!body) throw new AppError('Nothing to send')
    const room = required(this.deps.rooms.get(roomId), 'Room')
    const members = this.membersOf(required(this.deps.teams.get(room.teamId), 'Team'))
    const called = mentionedMembers(body, members)
    const target = called.length > 0 ? called : this.defaultMember(roomId, members)
    this.post(room, null, author, body)
    for (const member of target) this.call(room, member)
  }

  /** Stops what a member is doing now and drops what waits behind it. */
  async stop(roomId: Id, profileId: Id): Promise<void> {
    const run = this.runs.get(this.key(roomId, profileId))
    if (run) {
      run.generation++
      run.queued = 0
    }
    const sessionId = this.deps.rooms.member(roomId, profileId)?.sessionId
    if (sessionId != null) await this.deps.sessions.cancel(sessionId).catch(() => {})
    this.publish(roomId)
  }

  /** A member's session changed (working, waiting for approval, ...): the room shows it. */
  onSessionChanged(session: SessionDto): void {
    const link = this.deps.rooms.findBySession(session.id)
    if (link) this.publish(link.roomId)
  }

  // ---------------------------------------------------------------- calling members

  private call(room: RoomDto, member: ProfileDto): void {
    const run = this.runOf(room.id, member.id)
    const generation = run.generation
    run.queued++
    this.publish(room.id)
    run.tail = run.tail.then(() => this.runMember(room, member, run, generation))
  }

  private async runMember(room: RoomDto, member: ProfileDto, run: MemberRun, generation: number): Promise<void> {
    run.queued = Math.max(0, run.queued - 1)
    if (generation !== run.generation || !this.deps.rooms.get(room.id)) return this.publish(room.id)
    const unseen = this.unseenFor(room.id, member.id)
    if (unseen.length === 0) return this.publish(room.id) // an earlier run of this member already answered these messages
    run.running = true
    this.publish(room.id)
    try {
      const sessionId = await this.sessionOf(room, member)
      this.deps.rooms.setMemberSeen(room.id, member.id, unseen[unseen.length - 1].id)
      const reply = await this.deps.sessions.ask(sessionId, this.promptFor(room, unseen))
      run.running = false
      if (reply) this.answer(room, member, reply)
    } catch (error) {
      run.running = false
      if (this.deps.rooms.get(room.id)) this.answer(room, member, `I could not answer: ${error instanceof Error ? error.message : String(error)}`, false)
    } finally {
      run.running = false
      this.publish(room.id)
    }
  }

  /** A member's final message goes into the room; the members it @mentions start at once. */
  private answer(room: RoomDto, member: ProfileDto, text: string, callOthers = true): void {
    if (!this.deps.rooms.get(room.id)) return
    const posted = this.post(room, member.id, member.name, text)
    // What the member wrote itself needs no telling: it has seen it.
    this.deps.rooms.setMemberSeen(room.id, member.id, posted.id)
    if (!callOthers) return
    const team = this.deps.teams.get(room.teamId)
    if (!team) return
    for (const called of mentionedMembers(text, this.membersOf(team).filter((m) => m.id !== member.id))) this.call(room, called)
  }

  private async sessionOf(room: RoomDto, member: ProfileDto): Promise<Id> {
    const record = this.deps.rooms.ensureMember(room.id, member.id)
    const existing = record.sessionId === null ? null : this.deps.sessions.get(record.sessionId)
    if (existing) return existing.id
    const session = await this.deps.sessions.create(room.desktopId, member.agentId ?? undefined, room.cwd, member.name, (created) => this.deps.rooms.setMemberSession(room.id, member.id, created.id))
    if (member.model) await this.applyModel(session.id, member.model)
    return session.id
  }

  /** The profile's model, when the agent offers it by id or name; otherwise the agent's own choice stays. */
  private async applyModel(sessionId: Id, wanted: string): Promise<void> {
    const session = this.deps.sessions.get(sessionId)
    const lower = wanted.toLowerCase()
    const model = session?.models.find((m) => m.id.toLowerCase() === lower || m.name.toLowerCase() === lower)
    if (model && model.id !== session?.currentModelId) await this.deps.sessions.setModel(sessionId, model.id).catch(() => {})
  }

  // ---------------------------------------------------------------- what a member hears

  private unseenFor(roomId: Id, profileId: Id): RoomMessageDto[] {
    const seen = this.deps.rooms.member(roomId, profileId)?.lastSeenId ?? 0
    return this.deps.rooms.messages(roomId).filter((m) => m.id > seen && m.profileId !== profileId)
  }

  private promptFor(room: RoomDto, unseen: RoomMessageDto[]): string {
    const lines = unseen.map((m) => `${m.author}: ${m.text}`)
    return `New in the room "${room.title}":\n\n${lines.join('\n\n')}\n\nYou were called. Answer in the room.`
  }

  private defaultMember(roomId: Id, members: ProfileDto[]): ProfileDto[] {
    const lastSpeaker = [...this.deps.rooms.messages(roomId)].reverse().find((m) => m.profileId !== null)?.profileId
    const chosen = members.find((m) => m.id === lastSpeaker) ?? members[0]
    return chosen ? [chosen] : []
  }

  // ---------------------------------------------------------------- state

  private membersOf(team: TeamDto): ProfileDto[] {
    return team.memberIds.flatMap((id) => this.deps.profiles.get(id) ?? [])
  }

  private memberDto(room: RoomDto, profile: ProfileDto): RoomMemberDto {
    const run = this.runs.get(this.key(room.id, profile.id))
    const sessionId = this.deps.rooms.member(room.id, profile.id)?.sessionId ?? null
    const status = sessionId === null ? undefined : this.deps.sessions.get(sessionId)?.status
    const mapped = status === undefined ? undefined : ACTIVITY[status]
    // Working: what the session says; between two steps (or before its session exists) it is still starting or thinking.
    const working: MemberActivity = mapped !== undefined && mapped !== 'error' ? mapped : status === undefined ? 'starting' : 'thinking'
    const activity: MemberActivity = run?.running === true ? working : mapped === 'error' ? 'error' : 'idle'
    return { profileId: profile.id, name: profile.name, color: profile.color, sessionId, activity, queued: run?.queued ?? 0 }
  }

  private post(room: RoomDto, profileId: Id | null, author: string, text: string): RoomMessageDto {
    const message = this.deps.rooms.addMessage({ roomId: room.id, profileId, author, text })
    this.publish(room.id)
    return message
  }

  private publish(roomId: Id): void {
    if (!this.deps.rooms.get(roomId)) return
    this.deps.events.publish('room.changed', this.state(roomId))
  }

  private key(roomId: Id, profileId: Id): string {
    return `${roomId}:${profileId}`
  }

  private runOf(roomId: Id, profileId: Id): MemberRun {
    const key = this.key(roomId, profileId)
    let run = this.runs.get(key)
    if (!run) {
      run = { running: false, queued: 0, generation: 0, tail: Promise.resolve() }
      this.runs.set(key, run)
    }
    return run
  }
}
