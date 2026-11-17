import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../infrastructure/db/open-database'
import { SqliteAgentRepository } from '../infrastructure/db/sqlite-agent-repository'
import { ensureBuiltinAgents, type BuiltinAgent } from './BuiltinAgents'

const scripted = (path: string): BuiltinAgent => ({
  name: 'Scripted Agent',
  command: '/app/electron',
  args: [path, '--script', 'demo'],
  env: { ELECTRON_RUN_AS_NODE: '1' }
})

describe('ensureBuiltinAgents', () => {
  let repo: SqliteAgentRepository
  beforeEach(() => {
    repo = new SqliteAgentRepository(openDatabase(':memory:'))
  })

  it('adds the agent once, without taking over the default', () => {
    ensureBuiltinAgents(repo, [scripted('/a/scripted-agent.js')])
    ensureBuiltinAgents(repo, [scripted('/a/scripted-agent.js')])
    expect(repo.list().map((a) => a.name)).toEqual(['Claude Code', 'Scripted Agent'])
    expect(repo.getDefault()?.name).toBe('Claude Code')
    expect(repo.list()[1]).toMatchObject({ command: '/app/electron', args: ['/a/scripted-agent.js', '--script', 'demo'], env: { ELECTRON_RUN_AS_NODE: '1' } })
  })

  it('follows a moved install and keeps the user edits', () => {
    ensureBuiltinAgents(repo, [scripted('/a/scripted-agent.js')])
    const row = repo.list()[1]
    repo.update(row.id, { name: row.name, command: row.command, args: [row.args[0], '--script', 'errors'], env: { ...row.env, AGENTXP_SCRIPT_CONTROL: '/tmp/s' } })
    ensureBuiltinAgents(repo, [scripted('/b/scripted-agent.js')])
    expect(repo.list()).toHaveLength(2)
    expect(repo.list()[1]).toMatchObject({ args: ['/b/scripted-agent.js', '--script', 'errors'], env: { ELECTRON_RUN_AS_NODE: '1', AGENTXP_SCRIPT_CONTROL: '/tmp/s' } })
  })
})
