import { describe, expect, it } from 'vitest'
import { aboutOf, agentToSelect, commandOf } from './agentRows'

const agent = (name: string, command = 'node', args: string[] = []) => ({ name, command, args })

describe('aboutOf (UX-149)', () => {
  it('describes a known agent and shows the command of an agent you added', () => {
    expect(aboutOf(agent('Claude Code', 'claude-agent'))).toContain('Claude Code')
    expect(aboutOf(agent('node my-agent.js', 'node', ['my-agent.js']))).toBe('node my-agent.js')
    expect(commandOf(agent('x', 'node', ['a', 'b']))).toBe('node a b')
  })
})

describe('agentToSelect (UX-149)', () => {
  const problem = { kind: 'start-failed' } as never
  it('picks the agent of the newest chat with a problem', () => {
    const sessions = [
      { agentId: 1, problem: null, updatedAt: '2026-11-03T00:00:00Z' },
      { agentId: 2, problem, updatedAt: '2026-11-01T00:00:00Z' },
      { agentId: 3, problem, updatedAt: '2026-11-02T00:00:00Z' }
    ]
    expect(agentToSelect(sessions, [{ id: 1 }, { id: 2 }, { id: 3 }])).toBe(3)
  })
  it('picks none when no chat has a problem or its agent is gone', () => {
    expect(agentToSelect([{ agentId: 1, problem: null, updatedAt: '2026-11-03T00:00:00Z' }], [{ id: 1 }])).toBeNull()
    expect(agentToSelect([{ agentId: 9, problem, updatedAt: '2026-11-03T00:00:00Z' }], [{ id: 1 }])).toBeNull()
    expect(agentToSelect([], [])).toBeNull()
  })
})
