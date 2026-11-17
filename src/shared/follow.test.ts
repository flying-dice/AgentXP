import { describe, expect, it } from 'vitest'
import { callResultText, editedLines, followEndedText, followTarget } from './follow'

describe('follow: where a step of a followed chat goes', () => {
  it('reads go to their lines, relative paths resolve against the cwd', () => {
    expect(followTarget({ title: 'agentxp.code_read', rawInput: JSON.stringify({ path: 'src\\a.ts', startLine: 2, endLine: 4 }) }, 'E:\\')).toEqual({ kind: 'code', path: 'E:\\src\\a.ts', lines: [2, 4] })
  })

  it('an edit goes to the lines its result names, else the file', () => {
    const input = { title: 'agentxp.code_edit', rawInput: JSON.stringify({ path: 'E:\\a.ts' }) }
    expect(followTarget(input)).toEqual({ kind: 'code', path: 'E:\\a.ts', lines: null })
    expect(followTarget({ ...input, rawOutput: JSON.stringify({ text: 'Edited E:\\a.ts (line 9).', isError: false }) })).toEqual({ kind: 'code', path: 'E:\\a.ts', lines: [9, 9] })
  })

  it('runs go to the Terminal; browser steps and lists have no projection', () => {
    expect(followTarget({ title: 'agentxp.terminal_run', rawInput: JSON.stringify({ command: 'npm test' }) })).toEqual({ kind: 'terminal', terminalId: null, command: 'npm test' })
    expect(followTarget({ title: 'agentxp.browser_click', rawInput: JSON.stringify({ ref: 3 }) })).toBeNull()
    expect(followTarget({ title: 'agentxp.fs_list', rawInput: '{}' })).toBeNull()
  })

  it('reads the result from text content, else the raw output', () => {
    expect(callResultText({ contents: [{ kind: 'content', block: { kind: 'text', text: 'a' } }], rawOutput: '{"text":"b"}' })).toBe('a')
    expect(callResultText({ rawOutput: '{"text":"b"}' })).toBe('b')
    expect(callResultText({ rawOutput: 'plain' })).toBe('plain')
    expect(editedLines('Edited E:\\a.ts (lines 3-5).')).toEqual([3, 5])
    expect(editedLines('Edited E:\\a.ts (2 places).')).toBeNull()
  })

  it('says in one line why a follow ended on its own, nothing when the operator ended it', () => {
    expect(followEndedText('Builder', 'turn-ended')).toBe('Stopped following Builder: the turn ended.')
    expect(followEndedText('Builder', 'paused')).toBe('Stopped following Builder: agents are paused.')
    expect(followEndedText('Builder', 'closed')).toBe('Stopped following Builder: the chat closed.')
    expect(followEndedText('Builder', 'stopped')).toBeNull()
    expect(followEndedText('Builder', 'replaced')).toBeNull()
  })
})
