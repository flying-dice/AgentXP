import type { Id } from '@shared/models'
import { colorOfName, type ProfileDto, type ProfileInput, type TeamDto, type TeamInput } from '@shared/teams'
import type { ProfileRepository, TeamRepository } from '../../domain/repositories/teams-repositories'
import { AppError, required } from '../errors'

const cleanProfile = (input: ProfileInput): ProfileInput & { color: string } => {
  const name = input.name.trim()
  if (!name) throw new AppError('The profile needs a name')
  return {
    name,
    instructions: input.instructions.trim(),
    agentId: input.agentId,
    model: input.model?.trim() || null,
    skillIds: [...new Set(input.skillIds)],
    mcpServerIds: [...new Set(input.mcpServerIds)],
    color: input.color?.trim() || colorOfName(name)
  }
}

/** Profiles (members) and teams (groups of profiles with instructions and skills). */
export class TeamService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly teams: TeamRepository
  ) {}

  listProfiles(): ProfileDto[] {
    return this.profiles.list()
  }

  createProfile(input: ProfileInput): ProfileDto {
    const data = cleanProfile(input)
    this.requireFreeProfileName(data.name)
    return this.profiles.create(data)
  }

  updateProfile(id: Id, input: ProfileInput): ProfileDto {
    required(this.profiles.get(id), 'Profile')
    const data = cleanProfile(input)
    this.requireFreeProfileName(data.name, id)
    return required(this.profiles.update(id, data), 'Profile')
  }

  removeProfile(id: Id): void {
    required(this.profiles.remove(id) || null, 'Profile')
  }

  listTeams(): TeamDto[] {
    return this.teams.list()
  }

  createTeam(input: TeamInput): TeamDto {
    const data = this.cleanTeam(input)
    this.requireFreeTeamName(data.name)
    return this.teams.create(data)
  }

  updateTeam(id: Id, input: TeamInput): TeamDto {
    required(this.teams.get(id), 'Team')
    const data = this.cleanTeam(input)
    this.requireFreeTeamName(data.name, id)
    return required(this.teams.update(id, data), 'Team')
  }

  removeTeam(id: Id): void {
    required(this.teams.remove(id) || null, 'Team')
  }

  private cleanTeam(input: TeamInput): TeamInput {
    const name = input.name.trim()
    if (!name) throw new AppError('The team needs a name')
    const known = new Set(this.profiles.list().map((p) => p.id))
    const memberIds = [...new Set(input.memberIds)]
    if (memberIds.some((id) => !known.has(id))) throw new AppError('A member of the team no longer exists')
    return { name, instructions: input.instructions.trim(), skillIds: [...new Set(input.skillIds)], memberIds, boardRef: input.boardRef?.trim() || null }
  }

  private requireFreeProfileName(name: string, except?: Id): void {
    // @mentions find a member by its name: two members must not share a handle.
    const handle = (n: string): string => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    if (this.profiles.list().some((p) => p.id !== except && handle(p.name) === handle(name))) throw new AppError(`A profile named "${name}" exists already (names are what @mentions use).`)
  }

  private requireFreeTeamName(name: string, except?: Id): void {
    if (this.teams.list().some((t) => t.id !== except && t.name.toLowerCase() === name.toLowerCase())) throw new AppError(`A team named "${name}" exists already.`)
  }
}
