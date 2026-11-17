import { describe, expect, it } from 'vitest'
import type { AguiToolCallState } from '@shared/agui-state'
import { currentStep, stepWords } from './stepWords'

const mcp = (tool: string, input: unknown) => ({ title: `agentxp.${tool}`, rawInput: JSON.stringify(input) })

describe('stepWords: the step in plain words', () => {
  it('names the file of reads, edits and writes', () => {
    expect(stepWords(mcp('code_read', { path: 'E:\\src\\auth.ts' }))).toBe('reading auth.ts')
    expect(stepWords(mcp('code_edit', { path: 'E:\\src\\auth.ts' }))).toBe('editing auth.ts')
    expect(stepWords(mcp('code_write', { path: 'notes.md' }))).toBe('writing notes.md')
  })

  it('names the command of a run and the query of a search, cut when long', () => {
    expect(stepWords(mcp('terminal_run', { command: 'npm test' }))).toBe('running npm test')
    expect(stepWords(mcp('code_search', { query: 'token' }))).toBe('searching for "token"')
    expect(stepWords(mcp('terminal_run', { command: 'x'.repeat(80) }))?.length).toBeLessThanOrEqual('running '.length + 40)
  })

  it("uses the agent's own tool kind and location", () => {
    expect(stepWords({ title: 'Read', kind: 'read', rawInput: null, locations: [{ path: 'E:\\a\\b.ts', line: 3 }] })).toBe('reading b.ts')
    expect(stepWords({ title: 'Run tests', kind: 'execute', rawInput: JSON.stringify({ command: 'npm test' }) })).toBe('running npm test')
    expect(stepWords({ title: 'Edit file', kind: 'edit', rawInput: null, contents: [{ kind: 'diff', path: 'E:\\c.ts', oldText: null, newText: '' }] })).toBe('editing c.ts')
  })

  it('other tools read as their plain title; JSON never shows', () => {
    expect(stepWords(mcp('board_add_card', {}))).toBe('add a Kanban card')
    expect(stepWords({ title: '{"x": 1}', rawInput: null })).toBeNull()
  })

  it('currentStep is the newest running call', () => {
    const calls: Record<string, AguiToolCallState> = {
      a: { title: 'agentxp.code_read', kind: 'other', status: 'completed', rawInput: '{"path":"a.ts"}', locations: [], contents: [] },
      b: { title: 'agentxp.terminal_run', kind: 'other', status: 'in_progress', rawInput: '{"command":"npm test"}', locations: [], contents: [] }
    }
    expect(currentStep(calls)).toBe('running npm test')
    expect(currentStep({ a: calls.a })).toBeNull()
  })
})
