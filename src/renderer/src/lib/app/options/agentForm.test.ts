import { describe, expect, it } from 'vitest'
import { checkMessage, commandLine, emptyAgentForm, formatEnv, formFromAgent, inputFromForm, parseArgs, parseEnv, validateAgentForm } from './agentForm'

describe('agentForm', () => {
  it('parses one argument per line', () => {
    expect(parseArgs('-y\n@zed/acp \n\n--flag')).toEqual(['-y', '@zed/acp', '--flag'])
  })

  it('parses KEY=VALUE lines and reports bad ones', () => {
    expect(parseEnv('A=1\n\nB=x=y\nnope')).toEqual({ env: { A: '1', B: 'x=y' }, invalid: ['nope'] })
    expect(formatEnv({ A: '1', B: '2' })).toBe('A=1\nB=2')
  })

  it('validates and builds the input', () => {
    expect(validateAgentForm({ ...emptyAgentForm(), command: '' })).toMatch(/program/)
    expect(validateAgentForm({ name: 'n', command: 'x', args: '', env: 'bad', makeDefault: false, defaultModeId: '' })).toMatch(/KEY=VALUE/)
    expect(validateAgentForm({ ...emptyAgentForm(), command: 'node' })).toBeNull()
    expect(inputFromForm({ name: ' n ', command: ' npx ', args: '-y', env: 'A=1', makeDefault: false, defaultModeId: ' acceptEdits ' })).toEqual({ name: 'n', command: 'npx', args: ['-y'], env: { A: '1' }, defaultModeId: 'acceptEdits' })
  })

  it('names an agent after its command line when no name is typed', () => {
    expect(inputFromForm({ name: ' ', command: 'node', args: 'my-agent.js\n\n--x', env: '', makeDefault: true, defaultModeId: '' }).name).toBe('node my-agent.js --x')
    expect(commandLine({ command: ' node ', args: '' })).toBe('node')
  })

  it('starts as the default agent in Add and keeps the flag of an existing agent in Edit', () => {
    expect(emptyAgentForm().makeDefault).toBe(true)
    expect(formFromAgent({ id: 1, name: 'a', command: 'c', args: ['x'], env: {}, isDefault: false, defaultModeId: null }).makeDefault).toBe(false)
  })

  it('words the result of Test', () => {
    expect(checkMessage(' node ', true)).toBe("Found 'node'.")
    expect(checkMessage('node', false)).toBe("Could not find 'node'.")
  })
})
