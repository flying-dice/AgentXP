import { describe, expect, it } from 'vitest'
import { agentxpToolName, toVPath, toolShowTargets } from './toolShowTarget'

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
