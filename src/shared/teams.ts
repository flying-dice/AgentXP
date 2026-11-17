/**
 * Skills, MCP servers, profiles, teams and team chat rooms: the contract shared by main and renderer.
 * Pure types and pure functions only (no Node, no DOM). See docs/TEAMS.md.
 */
import type { Id, IsoDate } from './models'

// ---------------------------------------------------------------- skills

/** An installed skill: a folder with a `SKILL.md` (front matter `name` and `description`) kept in the app's data folder. */
export interface SkillDto {
  id: Id
  name: string
  description: string
  /** Where the installed copy lives (the folder that holds `SKILL.md`). */
  path: string
  enabled: boolean
  installedAt: IsoDate
}

// ---------------------------------------------------------------- MCP servers

export type McpTransport = 'stdio' | 'http'

/** An environment variable (stdio) or HTTP header (http) of a server. A secret is shown masked. */
export interface McpVarDto {
  key: string
  value: string
  secret: boolean
}

export interface McpToolDto {
  name: string
  description: string
  enabled: boolean
}

export interface McpTestResultDto {
  ok: boolean
  /** Plain words for the user ("Connected. 4 tools." or why it failed). */
  message: string
  at: IsoDate
}

export interface McpServerDto {
  id: Id
  name: string
  transport: McpTransport
  /** stdio: the program. */
  command: string
  args: string[]
  /** http: the endpoint. */
  url: string
  vars: McpVarDto[]
  enabled: boolean
  /** The tools found by the last successful test, each with its switch. */
  tools: McpToolDto[]
  lastTest: McpTestResultDto | null
}

export interface McpServerInput {
  name: string
  transport: McpTransport
  command: string
  args: string[]
  url: string
  vars: McpVarDto[]
}

// ---------------------------------------------------------------- profiles and teams

/**
 * A profile is one member of a team: a name, instructions (the role lives in them), the agent and model it runs on and
 * the skills and MCP servers it has of its own. A plain chat is not a profile: it gets everything installed.
 */
export interface ProfileDto {
  id: Id
  name: string
  instructions: string
  /** The agent program it runs on; null = the default agent. */
  agentId: Id | null
  /** The model it asks for once connected (an id or a name the agent offers); null keeps the agent's own choice. */
  model: string | null
  skillIds: Id[]
  mcpServerIds: Id[]
  /** Avatar colour (CSS colour), chosen from the name when none is set. */
  color: string
}

export type ProfileInput = Omit<ProfileDto, 'id' | 'color'> & { color?: string | null }

export interface TeamDto {
  id: Id
  name: string
  /** Shared by every member, in front of the profile's own instructions. */
  instructions: string
  /** Skills every member gets in addition to its own. */
  skillIds: Id[]
  /** Members in the order of the team; the first one answers a message without an @mention. */
  memberIds: Id[]
  /** Hook for a work board (Kanban) the team uses; an opaque reference, null when none. */
  boardRef: string | null
}

export type TeamInput = Omit<TeamDto, 'id'>

// ---------------------------------------------------------------- team chat rooms

/** What a member of a room is doing, driven by its ACP session. */
export type MemberActivity = 'idle' | 'starting' | 'thinking' | 'waiting' | 'error'

export interface RoomMemberDto {
  profileId: Id
  name: string
  color: string
  /** The member's own ACP session (opened on its first call); null before. The room shows it in a side panel. */
  sessionId: Id | null
  activity: MemberActivity
  /** Messages waiting behind the one it is working on. */
  queued: number
}

export interface RoomDto {
  id: Id
  desktopId: Id
  teamId: Id
  title: string
  /** The working directory every member starts in (a VPath). */
  cwd: string
  createdAt: IsoDate
}

/** One message of a room. `profileId` null is the user. Only final messages are kept: the room has no tool calls. */
export interface RoomMessageDto {
  id: Id
  roomId: Id
  profileId: Id | null
  author: string
  text: string
  createdAt: IsoDate
}

/** A room as the room window shows it. */
export interface RoomStateDto {
  room: RoomDto
  members: RoomMemberDto[]
  messages: RoomMessageDto[]
}

// ---------------------------------------------------------------- API

export interface SkillsApi {
  list(): Promise<SkillDto[]>
  /** Installs the skill folder at `path` (a real folder on the user's disk holding `SKILL.md`). */
  install(path: string): Promise<SkillDto>
  remove(id: Id): Promise<void>
  setEnabled(id: Id, enabled: boolean): Promise<void>
}

export interface McpApi {
  list(): Promise<McpServerDto[]>
  add(input: McpServerInput): Promise<McpServerDto>
  update(id: Id, input: McpServerInput): Promise<McpServerDto>
  remove(id: Id): Promise<void>
  setEnabled(id: Id, enabled: boolean): Promise<void>
  /** Connects to the saved server, lists its tools and keeps the result (and the switches of tools already known). */
  test(id: Id): Promise<McpServerDto>
  /** Connects with what the form holds, without saving (the Add dialog's Test button). */
  probe(input: McpServerInput): Promise<McpTestResultDto>
  setToolEnabled(id: Id, tool: string, enabled: boolean): Promise<void>
}

export interface ProfilesApi {
  list(): Promise<ProfileDto[]>
  create(input: ProfileInput): Promise<ProfileDto>
  update(id: Id, input: ProfileInput): Promise<ProfileDto>
  remove(id: Id): Promise<void>
}

export interface TeamsApi {
  list(): Promise<TeamDto[]>
  create(input: TeamInput): Promise<TeamDto>
  update(id: Id, input: TeamInput): Promise<TeamDto>
  remove(id: Id): Promise<void>
}

export interface RoomsApi {
  list(desktopId: Id): Promise<RoomDto[]>
  /** A new room for a team on a desktop; `cwd` defaults to the agent's home. */
  create(desktopId: Id, teamId: Id, cwd?: string): Promise<RoomDto>
  state(roomId: Id): Promise<RoomStateDto>
  remove(roomId: Id): Promise<void>
  rename(roomId: Id, title: string): Promise<void>
  /** The user speaks in the room. The call returns when the message is stored; the members answer on their own. */
  say(roomId: Id, text: string): Promise<void>
  /** Stops what a member is working on and drops what waits behind it. */
  stop(roomId: Id, profileId: Id): Promise<void>
}

export interface TeamsEvents {
  'room.changed': RoomStateDto
  'room.removed': { id: Id }
}

// ---------------------------------------------------------------- pure helpers

/** The name of a member as it is written after an @: letters and digits only, lower case ("Code Reviewer" is `codereviewer`). */
export const mentionHandle = (name: string): string => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * The members a message calls. `@Reviewer` or `@code-reviewer` calls the member whose handle matches (case and spaces
 * ignored); `@all` or `@team` calls everyone. Each member once, in the order of the team.
 */
export function mentionedMembers<M extends { name: string }>(text: string, members: readonly M[]): M[] {
  const handles = [...text.matchAll(/(?<![\p{L}\p{N}_.])@([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu)].map((m) => mentionHandle(m[1]))
  if (handles.length === 0) return []
  if (handles.includes('all') || handles.includes('team') || handles.includes('everyone')) return [...members]
  return members.filter((m) => handles.includes(mentionHandle(m.name)))
}

/** A stable avatar colour for a name. */
export function colorOfName(name: string): string {
  const palette = ['#3b7dd8', '#2e9a5f', '#c0612b', '#8a4fc2', '#b8902a', '#2a95a8', '#c2476b', '#5f7a2d']
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return palette[hash % palette.length]
}

/** The words shown next to a member in the room, or null when it is idle. */
export function activityLabel(activity: MemberActivity, queued: number): string | null {
  const base = { idle: null, starting: 'starting…', thinking: 'thinking…', waiting: 'waiting for approval', error: 'stopped with an error' }[activity]
  if (base === null) return null
  return queued > 0 ? `${base} (${queued} waiting)` : base
}

/**
 * Parses the front matter of a `SKILL.md`: the `name` and `description` between the first two `---` lines.
 * Values may be quoted. Null when there is no front matter or either key is missing.
 */
export function parseSkillFrontMatter(text: string): { name: string; description: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text.replace(/^﻿/, ''))
  if (!match) return null
  const read = (key: string): string => {
    const line = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(match[1])
    return (line?.[1] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2')
  }
  const name = read('name')
  const description = read('description')
  return name && description ? { name, description } : null
}
