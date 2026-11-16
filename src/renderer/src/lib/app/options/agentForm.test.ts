import { describe, expect, it } from 'vitest'
import { formatEnv, inputFromForm, parseArgs, parseEnv, validateAgentForm } from './agentForm'

describe('agentForm', () => {
  it('parses one argument per line', () => {
    expect(parseArgs('-y\n@zed/acp \n\n--flag')).toEqual(['-y', '@zed/acp', '--flag'])
  })

  it('parses KEY=VALUE lines and reports bad ones', () => {
    expect(parseEnv('A=1\n\nB=x=y\nnope')).toEqual({ env: { A: '1', B: 'x=y' }, invalid: ['nope'] })
    expect(formatEnv({ A: '1', B: '2' })).toBe('A=1\nB=2')
  })

  it('validates and builds the input', () => {
    expect(validateAgentForm({ name: '', command: 'x', args: '', env: '' })).toMatch(/name/)
    expect(validateAgentForm({ name: 'n', command: 'x', args: '', env: 'bad' })).toMatch(/KEY=VALUE/)
    expect(inputFromForm({ name: ' n ', command: ' npx ', args: '-y', env: 'A=1' })).toEqual({ name: 'n', command: 'npx', args: ['-y'], env: { A: '1' } })
  })
})
