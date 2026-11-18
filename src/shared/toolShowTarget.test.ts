import { describe, expect, it } from 'vitest'
import { agentxpToolName, showRowOf, toVPath, toolShowTargets } from './toolShowTarget'

const call = (title: string, rawInput: unknown, extra: Partial<Parameters<typeof toolShowTargets>[0]> = {}) =>
  toolShowTargets({ title, kind: 'other', rawInput: rawInput === null ? null : JSON.stringify(rawInput), cwd: 'E:\\', ...extra })

describe('agentxpToolName', () => {
  it('reads the tool from the names agents give MCP calls', () => {
    expect(agentxpToolName('agentxp.code_read')).toBe('code_read')
    expect(agentxpToolName('mcp__agentxp__code_edit')).toBe('code_edit')
    expect(agentxpToolName('terminal_run {"command":"ls"}')).toBe('terminal_run')
    expect(agentxpToolName('Read src/a.ts')).toBeNull()
    expect(agentxpToolName('board_add_card')).toBeNull()
  })
})

describe('toVPath', () => {
  it('keeps full VPaths, resolves relative paths against the cwd, refuses host paths', () => {
    expect(toVPath('e:/src/a.ts')).toBe('E:\\src\\a.ts')
    expect(toVPath('src/a.ts', 'E:\\')).toBe('E:\\src\\a.ts')
    expect(toVPath('src\\a.ts', 'E:\\app')).toBe('E:\\app\\src\\a.ts')
    expect(toVPath('/Users/me/a.ts', 'E:\\')).toBeNull()
    expect(toVPath('src/a.ts')).toBeNull()
  })
})

describe('toolShowTargets', () => {
  it('code_read: Code at the lines read, or the file without lines', () => {
    expect(call('agentxp.code_read', { path: 'src/index.ts', startLine: 2, endLine: 3 })).toEqual([{ kind: 'code', path: 'E:\\src\\index.ts', lines: [2, 3] }])
    expect(call('mcp__agentxp__code_read', { path: 'E:\\README.md' })).toEqual([{ kind: 'code', path: 'E:\\README.md', lines: null }])
    expect(call('agentxp.code_read', { path: 'src/a.ts', startLine: 7 })).toEqual([{ kind: 'code', path: 'E:\\src\\a.ts', lines: [7, 7] }])
  })

  it('code_edit and code_write: Show in Code and Show diff', () => {
    expect(call('agentxp.code_edit', { path: 'src/a.ts', oldText: 'a', newText: 'b' })).toEqual([
      { kind: 'code', path: 'E:\\src\\a.ts', lines: null },
      { kind: 'diff', path: 'E:\\src\\a.ts' }
    ])
    expect(call('agentxp.code_write', { path: 'E:\\new.ts', text: 'x' }).map((t) => t.kind)).toEqual(['code', 'diff'])
  })

  it('code_search: Code at the first match of the result, nothing without a match', () => {
    const result = '2 results in 1 file (searched 3 files below E:\\).\nE:\\src\\index.ts:2:14: export const needle = 1\nE:\\src\\index.ts:5:1: needle()'
    expect(call('agentxp.code_search', { query: 'needle' }, { result })).toEqual([{ kind: 'code', path: 'E:\\src\\index.ts', lines: [2, 2] }])
    expect(call('agentxp.code_search', { query: 'nothing' }, { result: 'No results.' })).toEqual([])
  })

  it('terminal_run and ACP terminals: the Terminal', () => {
    expect(call('agentxp.terminal_run', { command: 'npm test' })).toEqual([{ kind: 'terminal', terminalId: null, command: 'npm test' }])
    expect(call('terminal_run {"command":"ls"}', null)).toEqual([{ kind: 'terminal', terminalId: null, command: 'ls' }])
    expect(toolShowTargets({ title: 'npm test', kind: 'execute', rawInput: null, contents: [{ kind: 'terminal', terminalId: 't-1' }] })).toEqual([
      { kind: 'terminal', terminalId: 't-1', command: null }
    ])
  })

  it('browser_*: the Browser window the call drove', () => {
    expect(call('agentxp.browser_navigate', { url: 'https://example.com', window: 4 })).toEqual([{ kind: 'browser', windowId: 4, url: 'https://example.com' }])
    expect(call('agentxp.browser_click', { ref: 3 })).toEqual([{ kind: 'browser', windowId: null, url: null }])
  })

  it('the agent\'s own read and edit tools: the mapped location, or nothing for a host path', () => {
    expect(toolShowTargets({ title: 'Read E:\\a.ts', kind: 'read', rawInput: null, locations: [{ path: 'E:\\a.ts', line: 12 }] })).toEqual([
      { kind: 'code', path: 'E:\\a.ts', lines: [12, 12] }
    ])
    expect(toolShowTargets({ title: 'Edit', kind: 'edit', rawInput: null, contents: [{ kind: 'diff', path: 'E:\\b.ts', oldText: 'a', newText: 'b' }] }).map((t) => t.kind)).toEqual(['code', 'diff'])
    expect(toolShowTargets({ title: 'Read', kind: 'read', rawInput: null, locations: [{ path: '/home/me/outside.ts', line: null }] })).toEqual([])
  })

  it('has nothing to show for other tools', () => {
    expect(call('agentxp.fs_find', { pattern: '*.ts' })).toEqual([])
    expect(call('agentxp.board_get', {})).toEqual([])
    expect(toolShowTargets({ title: 'Think', kind: 'think', rawInput: null })).toEqual([])
  })
})

describe('show rows (Show, docs/AGENT_PRESENCE.md section 5)', () => {
  const input = { target: { kind: 'file', path: 'E:\\src\\auth.ts', lines: [40, 62] }, note: 'Here the token is checked' }

  it('a show row says what the operator was shown and why, with Show again', () => {
    expect(showRowOf({ title: 'mcp__agentxp__show', rawInput: JSON.stringify(input), result: 'Shown now: auth.ts:40-62\nThe user sees it.' })).toEqual({ title: 'Showed you auth.ts:40-62: Here the token is checked', again: true })
    expect(showRowOf({ title: 'agentxp.show', rawInput: JSON.stringify(input), result: 'Sent as a request: auth.ts:40-62\n...' })?.title).toBe('Asked to show you auth.ts:40-62: Here the token is checked')
    expect(showRowOf({ title: 'agentxp.show', rawInput: JSON.stringify(input), result: 'Queued: auth.ts:40-62\n...' })?.title).toBe('Will show you auth.ts:40-62: Here the token is checked')
    expect(call('mcp__agentxp__show', input)).toEqual([{ kind: 'again', target: input.target, note: 'Here the token is checked' }])
  })

  it('Never and a decline: no Show again; while it runs the row names the target', () => {
    expect(showRowOf({ title: 'agentxp.show', rawInput: JSON.stringify(input), result: 'Not shown (Never): auth.ts:40-62\n...' })).toEqual({ title: 'Not shown (Never): auth.ts:40-62', again: false })
    expect(showRowOf({ title: 'agentxp.show', rawInput: JSON.stringify(input), result: 'Not shown (declined): auth.ts:40-62\n...' })?.again).toBe(false)
    expect(showRowOf({ title: 'agentxp.show', rawInput: JSON.stringify(input), result: null })?.title).toBe('Show you auth.ts:40-62: Here the token is checked')
  })

  it('only the agentxp show tool: a bare "show" of another server and other tools are not show rows', () => {
    expect(showRowOf({ title: 'show', rawInput: JSON.stringify(input) })).toBeNull()
    expect(showRowOf({ title: 'agentxp.code_read', rawInput: '{}' })).toBeNull()
    expect(agentxpToolName('mcp__agentxp__show')).toBe('show')
  })
})
