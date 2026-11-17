import type { Id } from '@shared/models'
import type {
  McpServerDto,
  McpServerInput,
  McpTestResultDto,
  ProfileDto,
  ProfileInput,
  RoomDto,
  RoomMessageDto,
  SkillDto,
  TeamDto,
  TeamInput
} from '@shared/teams'

export interface SkillRepository {
  list(): SkillDto[]
  get(id: Id): SkillDto | null
  getByName(name: string): SkillDto | null
  add(input: { name: string; description: string; path: string }): SkillDto
  remove(id: Id): boolean
  setEnabled(id: Id, enabled: boolean): boolean
}

export interface McpServerRepository {
  list(): McpServerDto[]
  get(id: Id): McpServerDto | null
  create(input: McpServerInput): McpServerDto
  update(id: Id, input: McpServerInput): McpServerDto | null
  remove(id: Id): boolean
  setEnabled(id: Id, enabled: boolean): boolean
  /** Keeps the result of a test and replaces the tool list; tools already known keep their switch, new ones start on. */
  saveTest(id: Id, result: McpTestResultDto, tools: { name: string; description: string }[] | null): McpServerDto | null
  setToolEnabled(id: Id, tool: string, enabled: boolean): boolean
}

export interface ProfileRepository {
  list(): ProfileDto[]
  get(id: Id): ProfileDto | null
  create(input: ProfileInput & { color: string }): ProfileDto
  update(id: Id, input: ProfileInput & { color: string }): ProfileDto | null
  remove(id: Id): boolean
}

export interface TeamRepository {
  list(): TeamDto[]
  get(id: Id): TeamDto | null
  create(input: TeamInput): TeamDto
  update(id: Id, input: TeamInput): TeamDto | null
  remove(id: Id): boolean
}

export interface RoomMemberRecord {
  roomId: Id
  profileId: Id
  sessionId: Id | null
  lastSeenId: Id
}

export interface RoomRepository {
  list(desktopId: Id): RoomDto[]
  get(id: Id): RoomDto | null
  create(input: { desktopId: Id; teamId: Id; title: string; cwd: string }): RoomDto
  rename(id: Id, title: string): void
  remove(id: Id): boolean
  messages(roomId: Id): RoomMessageDto[]
  addMessage(input: { roomId: Id; profileId: Id | null; author: string; text: string }): RoomMessageDto
  /** The member rows of a room (created when the member is first called). */
  members(roomId: Id): RoomMemberRecord[]
  member(roomId: Id, profileId: Id): RoomMemberRecord | null
  ensureMember(roomId: Id, profileId: Id): RoomMemberRecord
  setMemberSession(roomId: Id, profileId: Id, sessionId: Id | null): void
  setMemberSeen(roomId: Id, profileId: Id, lastSeenId: Id): void
  /** The room whose member owns this session, if any. */
  findBySession(sessionId: Id): { roomId: Id; profileId: Id } | null
}
