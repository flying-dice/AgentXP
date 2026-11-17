import type { Id } from '@shared/models'
import type { ProfileDto, ProfileInput, RoomDto, TeamDto, TeamInput } from '@shared/teams'
import type { ListRow } from '../../kit/organisms/ListView'

export interface ProfileFormValues {
  name: string
  instructions: string
  /** '' = the default agent. */
  agentId: string
  model: string
  skillIds: number[]
  mcpServerIds: number[]
}

export const emptyProfileForm = (): ProfileFormValues => ({ name: '', instructions: '', agentId: '', model: '', skillIds: [], mcpServerIds: [] })

export const formFromProfile = (p: ProfileDto): ProfileFormValues => ({
  name: p.name,
  instructions: p.instructions,
  agentId: p.agentId === null ? '' : String(p.agentId),
  model: p.model ?? '',
  skillIds: [...p.skillIds],
  mcpServerIds: [...p.mcpServerIds]
})

export const profileInputFromForm = (f: ProfileFormValues): ProfileInput => ({
  name: f.name.trim(),
  instructions: f.instructions.trim(),
  agentId: f.agentId === '' ? null : Number(f.agentId),
  model: f.model.trim() || null,
  // Plain copies: the form's arrays are Svelte $state proxies, which Electron cannot send over IPC ("An object could not be cloned").
  skillIds: [...f.skillIds],
  mcpServerIds: [...f.mcpServerIds]
})

export const validateProfileForm = (f: ProfileFormValues): string | null => (f.name.trim() ? null : 'Enter a name. Teammates call this member with @name.')

export interface TeamFormValues {
  name: string
  instructions: string
  memberIds: number[]
  skillIds: number[]
  boardRef: string
}

export const emptyTeamForm = (): TeamFormValues => ({ name: '', instructions: '', memberIds: [], skillIds: [], boardRef: '' })

export const formFromTeam = (t: TeamDto): TeamFormValues => ({ name: t.name, instructions: t.instructions, memberIds: [...t.memberIds], skillIds: [...t.skillIds], boardRef: t.boardRef ?? '' })

export const teamInputFromForm = (f: TeamFormValues): TeamInput => ({
  name: f.name.trim(),
  instructions: f.instructions.trim(),
  memberIds: [...f.memberIds],
  skillIds: [...f.skillIds],
  boardRef: f.boardRef.trim() || null
})

export const validateTeamForm = (f: TeamFormValues): string | null => (f.name.trim() ? null : 'Enter a name for the team.')

const namesOf = (ids: readonly Id[], profiles: readonly ProfileDto[]): string => ids.flatMap((id) => profiles.find((p) => p.id === id)?.name ?? []).join(', ')

export const teamRows = (teams: readonly TeamDto[], profiles: readonly ProfileDto[]): ListRow[] =>
  teams.map((t) => ({ id: String(t.id), icon: 'user', name: t.name, members: namesOf(t.memberIds, profiles) || 'No members yet', skills: t.skillIds.length === 0 ? '' : String(t.skillIds.length) }))

export const profileRows = (profiles: readonly ProfileDto[], teams: readonly TeamDto[]): ListRow[] =>
  profiles.map((p) => ({
    id: String(p.id),
    icon: 'agent',
    name: p.name,
    about: p.instructions.split(/\r?\n/).find((l) => l.trim())?.trim() ?? '',
    teams: teams.filter((t) => t.memberIds.includes(p.id)).map((t) => t.name).join(', ')
  }))

export const roomRows = (rooms: readonly RoomDto[], teams: readonly TeamDto[]): ListRow[] =>
  rooms.map((r) => ({ id: String(r.id), icon: 'session', title: r.title, team: teams.find((t) => t.id === r.teamId)?.name ?? '', created: r.createdAt.slice(0, 16).replace('T', ' ') }))
