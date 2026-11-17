import { describe, expect, it } from 'vitest'
import { createFixture } from '../../infrastructure/db/test-helpers'
import { SqliteMcpServerRepository } from '../../infrastructure/db/sqlite-mcp-server-repository'
import { SqliteSkillRepository } from '../../infrastructure/db/sqlite-skill-repository'
import { SqliteProfileRepository, SqliteTeamRepository } from '../../infrastructure/db/sqlite-team-repositories'
import { McpServerService, toMcpConfig } from './McpServerService'
import type { McpProber, SkillStore } from './ports'
import { SkillService, skillFolderName } from './SkillService'
import { TeamService } from './TeamService'

class FakeStore implements SkillStore {
  files = new Map<string, string>()
  copied: [string, string][] = []
  removed: string[] = []
  async readSkillFile(folder: string): Promise<string | null> {
    return this.files.get(folder) ?? null
  }
  async copy(folder: string, destination: string): Promise<void> {
    this.copied.push([folder, destination])
  }
  async remove(folder: string): Promise<void> {
    this.removed.push(folder)
  }
}

describe('SkillService', () => {
  const setup = () => {
    const store = new FakeStore()
    const repo = new SqliteSkillRepository(createFixture().db)
    return { store, service: new SkillService(repo, store, '/data/skills') }
  }

  it('installs a folder with a SKILL.md into the skills folder', async () => {
    const { store, service } = setup()
    store.files.set('/src/pdf', '---\nname: PDF Tools\ndescription: Work with PDFs\n---\nbody')
    const skill = await service.install('/src/pdf')
    expect(skill).toMatchObject({ name: 'PDF Tools', description: 'Work with PDFs', enabled: true })
    expect(store.copied).toEqual([['/src/pdf', expect.stringMatching(/PDF-Tools$/)]])
    expect(skill.path).toBe(store.copied[0][1])
  })

  it('says what is wrong with a folder that is not a skill', async () => {
    const { store, service } = setup()
    await expect(service.install('/nothing')).rejects.toThrow(/no SKILL\.md/)
    store.files.set('/bad', '# no front matter')
    await expect(service.install('/bad')).rejects.toThrow(/front matter/)
  })

  it('refuses a second skill with the same name', async () => {
    const { store, service } = setup()
    store.files.set('/a', '---\nname: x\ndescription: y\n---\n')
    await service.install('/a')
    await expect(service.install('/a')).rejects.toThrow(/installed already/)
  })

  it('removes the row and the copy, and switches', async () => {
    const { store, service } = setup()
    store.files.set('/a', '---\nname: x\ndescription: y\n---\n')
    const skill = await service.install('/a')
    service.setEnabled(skill.id, false)
    expect(service.list()[0].enabled).toBe(false)
    await service.remove(skill.id)
    expect(service.list()).toEqual([])
    expect(store.removed).toEqual([skill.path])
    await expect(service.remove(skill.id)).rejects.toThrow(/not found/)
  })

  it('makes folder names safe', () => {
    expect(skillFolderName(' a/b c ')).toBe('a-b-c')
    expect(skillFolderName('...')).toBe('skill')
  })
})

describe('McpServerService', () => {
  const stdio = { name: 'github', transport: 'stdio' as const, command: 'npx', args: ['-y', 'x'], url: '', vars: [{ key: 'TOKEN', value: 'secret', secret: true }] }
  const setup = (prober: McpProber) => new McpServerService(new SqliteMcpServerRepository(createFixture().db), prober, () => '2026-01-01T00:00:00.000Z')
  const tools: McpProber = { listTools: async () => [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }] }
  const broken: McpProber = { listTools: async () => Promise.reject(new Error('spawn x ENOENT')) }

  it('validates the form like the dialog does', () => {
    const service = setup(tools)
    expect(() => service.add({ ...stdio, name: ' ' })).toThrow(/name/)
    expect(() => service.add({ ...stdio, name: 'bad name' })).toThrow(/letters/)
    expect(() => service.add({ ...stdio, name: 'agent7' })).toThrow(/Agent7 itself/)
    expect(() => service.add({ ...stdio, command: ' ' })).toThrow(/command/)
    expect(() => service.add({ ...stdio, transport: 'http', url: 'ftp://x' })).toThrow(/http/)
  })

  it('adds, edits and removes, with unique names', () => {
    const service = setup(tools)
    const a = service.add(stdio)
    expect(() => service.add({ ...stdio, name: 'GitHub' })).toThrow(/installed already/)
    const b = service.add({ ...stdio, name: 'other' })
    expect(() => service.update(b.id, { ...stdio, name: 'github' })).toThrow(/installed already/)
    expect(service.update(a.id, { ...stdio, command: 'node' }).command).toBe('node')
    service.remove(a.id)
    expect(service.list().map((s) => s.name)).toEqual(['other'])
  })

  it('keeps the tools and the result of a test, and the switch of a tool', async () => {
    const service = setup(tools)
    const server = service.add(stdio)
    const tested = await service.test(server.id)
    expect(tested.lastTest).toEqual({ ok: true, message: 'Connected. 2 tools.', at: '2026-01-01T00:00:00.000Z' })
    service.setToolEnabled(server.id, 'b', false)
    expect((await service.test(server.id)).tools.map((t) => t.enabled)).toEqual([true, false])
    expect(() => service.setToolEnabled(server.id, 'nope', false)).toThrow(/not found/)
  })

  it('reports a failed connection as a result, not an error', async () => {
    const service = setup(broken)
    const server = service.add(stdio)
    const tested = await service.test(server.id)
    expect(tested.lastTest).toMatchObject({ ok: false, message: 'Could not connect: spawn x ENOENT' })
    expect(await service.probe(stdio)).toMatchObject({ ok: false })
  })

  it('hands the variables over as environment (program) or headers (address)', () => {
    const vars = [{ key: 'K', value: 'v', secret: false }]
    expect(toMcpConfig({ name: 'a', transport: 'stdio', command: 'c', args: ['x'], url: '', vars })).toEqual({ kind: 'stdio', name: 'a', command: 'c', args: ['x'], env: { K: 'v' } })
    expect(toMcpConfig({ name: 'a', transport: 'http', command: '', args: [], url: 'https://x', vars })).toEqual({ kind: 'http', name: 'a', url: 'https://x', headers: { K: 'v' } })
  })
})

describe('TeamService', () => {
  const setup = () => {
    const f = createFixture()
    return new TeamService(new SqliteProfileRepository(f.db), new SqliteTeamRepository(f.db))
  }
  const profile = (name: string) => ({ name, instructions: ' do it ', agentId: null, model: ' ', skillIds: [1, 1], mcpServerIds: [] })

  it('cleans a profile and picks a colour', () => {
    const created = setup().createProfile({ ...profile(' Coder '), skillIds: [] })
    expect(created).toMatchObject({ name: 'Coder', instructions: 'do it', model: null })
    expect(created.color).toMatch(/^#/)
  })

  it('refuses two profiles whose @handles are the same', () => {
    const service = setup()
    service.createProfile({ ...profile('Code Reviewer'), skillIds: [] })
    expect(() => service.createProfile({ ...profile('code-reviewer'), skillIds: [] })).toThrow(/@mentions/)
  })

  it('makes teams of existing profiles only', () => {
    const service = setup()
    const a = service.createProfile({ ...profile('A'), skillIds: [] })
    const team = service.createTeam({ name: 'T', instructions: '', skillIds: [], memberIds: [a.id, a.id], boardRef: ' ' })
    expect(team).toMatchObject({ memberIds: [a.id], boardRef: null })
    expect(() => service.createTeam({ name: 'U', instructions: '', skillIds: [], memberIds: [999], boardRef: null })).toThrow(/no longer exists/)
    expect(() => service.createTeam({ name: 't', instructions: '', skillIds: [], memberIds: [], boardRef: null })).toThrow(/exists already/)
    service.removeTeam(team.id)
    expect(service.listTeams()).toEqual([])
  })
})
