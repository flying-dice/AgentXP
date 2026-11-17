import { describe, expect, it } from 'vitest'
import { PARENT_SESSION_VARIABLES, childEnv } from './childEnv'

describe('childEnv', () => {
  const parent = {
    PATH: '/usr/bin',
    HOME: '/home/me',
    ANTHROPIC_API_KEY: 'key',
    CLAUDE_CODE_USE_BEDROCK: '1',
    CLAUDECODE: '1',
    CLAUDE_CODE_ENTRYPOINT: 'cli',
    CLAUDE_CODE_SESSION_ID: 'abc',
    CLAUDE_CODE_MESSAGING_TOKEN: 'secret',
    AI_AGENT: 'claude-code'
  }

  it('drops the variables of a parent Claude Code session, so a Claude agent started by AgentXP runs', () => {
    const env = childEnv({}, parent)
    for (const name of PARENT_SESSION_VARIABLES) expect(env[name]).toBeUndefined()
  })

  it('keeps everything else, configuration of Claude included', () => {
    expect(childEnv({}, parent)).toMatchObject({ PATH: '/usr/bin', HOME: '/home/me', ANTHROPIC_API_KEY: 'key', CLAUDE_CODE_USE_BEDROCK: '1' })
  })

  it('applies what the caller sets last (an agent may set CLAUDECODE for its own terminals)', () => {
    expect(childEnv({ CLAUDECODE: '1', EXTRA: 'x' }, parent)).toMatchObject({ CLAUDECODE: '1', EXTRA: 'x' })
  })
})
