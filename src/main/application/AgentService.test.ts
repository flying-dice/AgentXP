import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentService } from './AgentService'
import { openDatabase } from '../infrastructure/db/open-database'
import { SqliteAgentRepository } from '../infrastructure/db/sqlite-agent-repository'

describe('AgentService default scope', () => {
  let db: ReturnType<typeof openDatabase>
  let agents: SqliteAgentRepository
  beforeEach(() => {
    db = openDatabase(':memory:')
    agents = new SqliteAgentRepository(db)
  })
  afterEach(() => db.close())

  it('keeps the global default when the requested desktop cannot be updated', () => {
    const original = agents.getDefault()
    const other = agents.create({ name: 'Other', command: 'other', args: [], env: {} })
    const service = new AgentService(agents, undefined, undefined, () => { throw new Error('Desktop not found') })
    expect(() => service.setDefault(other.id, 999)).toThrow('Desktop not found')
    expect(agents.getDefault()).toEqual(original)
  })

  it('does not change a desktop when the requested agent does not exist', () => {
    const useOnDesktop = vi.fn()
    const service = new AgentService(agents, undefined, undefined, useOnDesktop)
    expect(() => service.setDefault(999, 1)).toThrow('Agent')
    expect(useOnDesktop).not.toHaveBeenCalled()
  })
})
