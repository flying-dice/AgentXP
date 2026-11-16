import { describe, expect, it } from 'vitest'
import { MISSING_DEFAULT_QUESTION, aboutOf, agentToSelect, commandOf, missingWord, probePrograms } from './agentRows'

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

describe('the state of each agent (UX-197)', () => {
  it('says "Not installed" for a known agent and "Not found" for one you added, whose program is missing', () => {
    expect(aboutOf(agent('Claude Code', 'npx', ['claude-agent']), 'missing')).toBe('Not installed')
    expect(aboutOf(agent('My assistant', 'not-a-real-command'), 'missing')).toBe('Not found')
    expect(missingWord(agent('Scripted Agent', 'node', ['scripted-agent.js']))).toBe('Not installed')
  })
  it('keeps the normal About text for a program that is there, or not looked up yet', () => {
    expect(aboutOf(agent('Claude Code', 'npx', ['claude-agent']), 'found')).toContain('Claude Code')
    expect(aboutOf(agent('My assistant', 'node', ['a.js']))).toBe('node a.js')
    expect(aboutOf(agent('My assistant', 'node', ['a.js']), 'unknown')).toBe('node a.js')
  })
  it('asks before a missing program becomes the default', () => {
    expect(MISSING_DEFAULT_QUESTION).toBe('This program was not found. Make it the default anyway?')
  })

  it('probes the program of every agent, a shared command once', async () => {
    const asked: string[] = []
    const check = async (command: string): Promise<boolean> => (asked.push(command), command !== 'not-a-real-command')
    const agents = [
      { id: 1, command: 'npx' },
      { id: 2, command: 'node' },
      { id: 3, command: 'not-a-real-command' },
      { id: 4, command: 'node' }
    ]
    const states = await probePrograms(agents, check)
    expect([...states]).toEqual([[1, 'found'], [2, 'found'], [3, 'missing'], [4, 'found']])
    expect(asked).toEqual(['npx', 'node', 'not-a-real-command'])
  })
  it('leaves an agent unknown when the check itself fails', async () => {
    const states = await probePrograms([{ id: 1, command: 'x' }], async () => Promise.reject(new Error('no')))
    expect(states.get(1)).toBe('unknown')
  })
})
