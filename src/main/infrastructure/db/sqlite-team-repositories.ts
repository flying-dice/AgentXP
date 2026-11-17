import type { Id } from '@shared/models'
import type { ProfileDto, ProfileInput, RoomDto, RoomMessageDto, TeamDto, TeamInput } from '@shared/teams'
import type { ProfileRepository, RoomMemberRecord, RoomRepository, TeamRepository } from '../../domain/repositories/teams-repositories'
import { prepare, transaction, type Database } from './sql'

const ids = (db: Database, sql: string, id: Id): Id[] => prepare<[Id], { v: number }>(db, sql).all(id).map((r) => r.v)

interface ProfileRow {
  id: number
  name: string
  instructions: string
  agent_id: number | null
  model: string | null
  color: string
}

export class SqliteProfileRepository implements ProfileRepository {
  constructor(private readonly db: Database) {}

  list(): ProfileDto[] {
    return prepare<[], ProfileRow>(this.db, 'SELECT * FROM profiles ORDER BY name COLLATE NOCASE').all().map((r) => this.toDto(r))
  }

  get(id: Id): ProfileDto | null {
    const row = prepare<[Id], ProfileRow>(this.db, 'SELECT * FROM profiles WHERE id = ?').get(id)
    return row ? this.toDto(row) : null
  }

  create(input: ProfileInput & { color: string }): ProfileDto {
    const id = transaction(this.db, () => {
      const newId = Number(prepare<[string, string, number | null, string | null, string]>(this.db, 'INSERT INTO profiles (name, instructions, agent_id, model, color) VALUES (?, ?, ?, ?, ?)').run(input.name, input.instructions, input.agentId, input.model, input.color).lastInsertRowid)
      this.writeLinks(newId, input)
      return newId
    })
    return this.require(id)
  }

  update(id: Id, input: ProfileInput & { color: string }): ProfileDto | null {
    transaction(this.db, () => {
      const changes = prepare<[string, string, number | null, string | null, string, Id]>(this.db, 'UPDATE profiles SET name = ?, instructions = ?, agent_id = ?, model = ?, color = ? WHERE id = ?').run(input.name, input.instructions, input.agentId, input.model, input.color, id).changes
      if (changes === 0) return
      prepare<[Id]>(this.db, 'DELETE FROM profile_skills WHERE profile_id = ?').run(id)
      prepare<[Id]>(this.db, 'DELETE FROM profile_mcp_servers WHERE profile_id = ?').run(id)
      this.writeLinks(id, input)
    })
    return this.get(id)
  }

  remove(id: Id): boolean {
    return prepare<[Id]>(this.db, 'DELETE FROM profiles WHERE id = ?').run(id).changes > 0
  }

  private writeLinks(id: Id, input: ProfileInput): void {
    const skill = prepare<[Id, Id]>(this.db, 'INSERT OR IGNORE INTO profile_skills (profile_id, skill_id) VALUES (?, ?)')
    input.skillIds.forEach((s) => skill.run(id, s))
    const server = prepare<[Id, Id]>(this.db, 'INSERT OR IGNORE INTO profile_mcp_servers (profile_id, server_id) VALUES (?, ?)')
    input.mcpServerIds.forEach((s) => server.run(id, s))
  }

  private require(id: Id): ProfileDto {
    const p = this.get(id)
    if (!p) throw new Error(`Profile ${id} vanished after write`)
    return p
  }

  private toDto(r: ProfileRow): ProfileDto {
    return {
      id: r.id,
      name: r.name,
      instructions: r.instructions,
      agentId: r.agent_id,
      model: r.model,
      color: r.color,
      skillIds: ids(this.db, 'SELECT skill_id AS v FROM profile_skills WHERE profile_id = ? ORDER BY skill_id', r.id),
      mcpServerIds: ids(this.db, 'SELECT server_id AS v FROM profile_mcp_servers WHERE profile_id = ? ORDER BY server_id', r.id)
    }
  }
}

interface TeamRow {
  id: number
  name: string
  instructions: string
  board_ref: string | null
}

export class SqliteTeamRepository implements TeamRepository {
  constructor(private readonly db: Database) {}

  list(): TeamDto[] {
    return prepare<[], TeamRow>(this.db, 'SELECT * FROM teams ORDER BY name COLLATE NOCASE').all().map((r) => this.toDto(r))
  }

  get(id: Id): TeamDto | null {
    const row = prepare<[Id], TeamRow>(this.db, 'SELECT * FROM teams WHERE id = ?').get(id)
    return row ? this.toDto(row) : null
  }

  create(input: TeamInput): TeamDto {
    const id = transaction(this.db, () => {
      const newId = Number(prepare<[string, string, string | null]>(this.db, 'INSERT INTO teams (name, instructions, board_ref) VALUES (?, ?, ?)').run(input.name, input.instructions, input.boardRef).lastInsertRowid)
      this.writeLinks(newId, input)
      return newId
    })
    const team = this.get(id)
    if (!team) throw new Error(`Team ${id} vanished after write`)
    return team
  }

  update(id: Id, input: TeamInput): TeamDto | null {
    transaction(this.db, () => {
      if (prepare<[string, string, string | null, Id]>(this.db, 'UPDATE teams SET name = ?, instructions = ?, board_ref = ? WHERE id = ?').run(input.name, input.instructions, input.boardRef, id).changes === 0) return
      prepare<[Id]>(this.db, 'DELETE FROM team_members WHERE team_id = ?').run(id)
      prepare<[Id]>(this.db, 'DELETE FROM team_skills WHERE team_id = ?').run(id)
      this.writeLinks(id, input)
    })
    return this.get(id)
  }

  remove(id: Id): boolean {
    return prepare<[Id]>(this.db, 'DELETE FROM teams WHERE id = ?').run(id).changes > 0
  }

  private writeLinks(id: Id, input: TeamInput): void {
    const member = prepare<[Id, Id, number]>(this.db, 'INSERT OR IGNORE INTO team_members (team_id, profile_id, position) VALUES (?, ?, ?)')
    input.memberIds.forEach((p, position) => member.run(id, p, position))
    const skill = prepare<[Id, Id]>(this.db, 'INSERT OR IGNORE INTO team_skills (team_id, skill_id) VALUES (?, ?)')
    input.skillIds.forEach((s) => skill.run(id, s))
  }

  private toDto(r: TeamRow): TeamDto {
    return {
      id: r.id,
      name: r.name,
      instructions: r.instructions,
      boardRef: r.board_ref,
      memberIds: ids(this.db, 'SELECT profile_id AS v FROM team_members WHERE team_id = ? ORDER BY position', r.id),
      skillIds: ids(this.db, 'SELECT skill_id AS v FROM team_skills WHERE team_id = ? ORDER BY skill_id', r.id)
    }
  }
}

interface RoomRow {
  id: number
  desktop_id: number
  team_id: number
  title: string
  cwd: string
  created_at: string
}

const toRoom = (r: RoomRow): RoomDto => ({ id: r.id, desktopId: r.desktop_id, teamId: r.team_id, title: r.title, cwd: r.cwd, createdAt: r.created_at })

interface MessageRow {
  id: number
  room_id: number
  profile_id: number | null
  author: string
  text: string
  created_at: string
}

const toMessage = (r: MessageRow): RoomMessageDto => ({ id: r.id, roomId: r.room_id, profileId: r.profile_id, author: r.author, text: r.text, createdAt: r.created_at })

interface MemberRow {
  room_id: number
  profile_id: number
  session_id: number | null
  last_seen_id: number
}

const toMember = (r: MemberRow): RoomMemberRecord => ({ roomId: r.room_id, profileId: r.profile_id, sessionId: r.session_id, lastSeenId: r.last_seen_id })

export class SqliteRoomRepository implements RoomRepository {
  constructor(private readonly db: Database) {}

  list(desktopId: Id): RoomDto[] {
    return prepare<[Id], RoomRow>(this.db, 'SELECT * FROM rooms WHERE desktop_id = ? ORDER BY id DESC').all(desktopId).map(toRoom)
  }

  get(id: Id): RoomDto | null {
    const row = prepare<[Id], RoomRow>(this.db, 'SELECT * FROM rooms WHERE id = ?').get(id)
    return row ? toRoom(row) : null
  }

  create(input: { desktopId: Id; teamId: Id; title: string; cwd: string }): RoomDto {
    const id = Number(prepare<[Id, Id, string, string]>(this.db, 'INSERT INTO rooms (desktop_id, team_id, title, cwd) VALUES (?, ?, ?, ?)').run(input.desktopId, input.teamId, input.title, input.cwd).lastInsertRowid)
    const room = this.get(id)
    if (!room) throw new Error(`Room ${id} vanished after write`)
    return room
  }

  rename(id: Id, title: string): void {
    prepare<[string, Id]>(this.db, 'UPDATE rooms SET title = ? WHERE id = ?').run(title, id)
  }

  remove(id: Id): boolean {
    return prepare<[Id]>(this.db, 'DELETE FROM rooms WHERE id = ?').run(id).changes > 0
  }

  messages(roomId: Id): RoomMessageDto[] {
    return prepare<[Id], MessageRow>(this.db, 'SELECT * FROM room_messages WHERE room_id = ? ORDER BY id').all(roomId).map(toMessage)
  }

  addMessage(input: { roomId: Id; profileId: Id | null; author: string; text: string }): RoomMessageDto {
    const id = Number(prepare<[Id, number | null, string, string]>(this.db, 'INSERT INTO room_messages (room_id, profile_id, author, text) VALUES (?, ?, ?, ?)').run(input.roomId, input.profileId, input.author, input.text).lastInsertRowid)
    return toMessage(prepare<[Id], MessageRow>(this.db, 'SELECT * FROM room_messages WHERE id = ?').get(id)!)
  }

  members(roomId: Id): RoomMemberRecord[] {
    return prepare<[Id], MemberRow>(this.db, 'SELECT * FROM room_members WHERE room_id = ?').all(roomId).map(toMember)
  }

  member(roomId: Id, profileId: Id): RoomMemberRecord | null {
    const row = prepare<[Id, Id], MemberRow>(this.db, 'SELECT * FROM room_members WHERE room_id = ? AND profile_id = ?').get(roomId, profileId)
    return row ? toMember(row) : null
  }

  ensureMember(roomId: Id, profileId: Id): RoomMemberRecord {
    prepare<[Id, Id]>(this.db, 'INSERT OR IGNORE INTO room_members (room_id, profile_id) VALUES (?, ?)').run(roomId, profileId)
    return this.member(roomId, profileId)!
  }

  setMemberSession(roomId: Id, profileId: Id, sessionId: Id | null): void {
    prepare<[number | null, Id, Id]>(this.db, 'UPDATE room_members SET session_id = ? WHERE room_id = ? AND profile_id = ?').run(sessionId, roomId, profileId)
  }

  setMemberSeen(roomId: Id, profileId: Id, lastSeenId: Id): void {
    prepare<[Id, Id, Id]>(this.db, 'UPDATE room_members SET last_seen_id = ? WHERE room_id = ? AND profile_id = ?').run(lastSeenId, roomId, profileId)
  }

  findBySession(sessionId: Id): { roomId: Id; profileId: Id } | null {
    const row = prepare<[Id], MemberRow>(this.db, 'SELECT * FROM room_members WHERE session_id = ?').get(sessionId)
    return row ? { roomId: row.room_id, profileId: row.profile_id } : null
  }
}
