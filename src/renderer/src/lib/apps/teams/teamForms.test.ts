import { describe, expect, it } from 'vitest'
import type { ProfileDto, TeamDto } from '@shared/teams'
import { emptyProfileForm, emptyTeamForm, profileInputFromForm, profileRows, teamInputFromForm, teamRows, validateProfileForm, validateTeamForm } from './teamForms'

const profile = (id: number, name: string, instructions = ''): ProfileDto => ({ id, name, instructions, agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000' })
const team: TeamDto = { id: 1, name: 'T', instructions: '', skillIds: [4], memberIds: [2, 1], boardRef: null }

describe('team forms', () => {
  it('needs a name', () => {
    expect(validateProfileForm(emptyProfileForm())).toMatch(/name/)
    expect(validateTeamForm(emptyTeamForm())).toMatch(/name/)
    expect(validateProfileForm({ ...emptyProfileForm(), name: 'Coder' })).toBeNull()
  })

  it('turns forms into inputs', () => {
    expect(profileInputFromForm({ ...emptyProfileForm(), name: ' Coder ', agentId: '3', model: ' ' })).toMatchObject({ name: 'Coder', agentId: 3, model: null })
    expect(profileInputFromForm(emptyProfileForm()).agentId).toBeNull()
    expect(teamInputFromForm({ ...emptyTeamForm(), name: ' T ', boardRef: ' b1 ' })).toMatchObject({ name: 'T', boardRef: 'b1' })
  })

  it('lists teams with their members in team order', () => {
    const profiles = [profile(1, 'Planner'), profile(2, 'Coder')]
    expect(teamRows([team], profiles)[0]).toMatchObject({ members: 'Coder, Planner', skills: '1' })
    expect(teamRows([{ ...team, memberIds: [] }], profiles)[0].members).toBe('No members yet')
  })

  it('lists profiles with the first line of their instructions and their teams', () => {
    const rows = profileRows([profile(1, 'Planner', '\nPlan the work.\nMore.')], [team])
    expect(rows[0]).toMatchObject({ about: 'Plan the work.', teams: 'T' })
  })
})
