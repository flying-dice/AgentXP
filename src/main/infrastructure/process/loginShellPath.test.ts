import { describe, expect, it } from 'vitest'
import { inheritLoginShellPath, mergePaths, parseMarkedPath, readLoginShellPath } from './loginShellPath'

describe('parseMarkedPath', () => {
  it('reads the PATH between the markers and ignores profile noise', () => {
    expect(parseMarkedPath('hello\n__AGENTXP_PATH_START__/a:/b__AGENTXP_PATH_END__\nbye')).toBe('/a:/b')
  })
  it('is null without markers or with an empty value', () => {
    expect(parseMarkedPath('nothing')).toBeNull()
    expect(parseMarkedPath('__AGENTXP_PATH_START____AGENTXP_PATH_END__')).toBeNull()
  })
})

describe('mergePaths', () => {
  it('keeps the current entries first and appends new ones once', () => {
    expect(mergePaths('/usr/bin:/bin', '/home/u/.nvm/bin:/usr/bin')).toBe('/usr/bin:/bin:/home/u/.nvm/bin')
    expect(mergePaths(undefined, '/x')).toBe('/x')
    expect(mergePaths('/a', null)).toBe('/a')
  })
})

describe('inheritLoginShellPath', () => {
  it('adds the login shell PATH to the environment', () => {
    const env: NodeJS.ProcessEnv = { PATH: '/usr/bin:/bin' }
    inheritLoginShellPath(env, () => '/home/u/.nvm/bin:/usr/bin')
    if (process.platform !== 'win32') expect(env['PATH']).toBe('/usr/bin:/bin:/home/u/.nvm/bin')
  })
})

describe('readLoginShellPath', () => {
  it.skipIf(process.platform === 'win32')('reads the PATH of a real shell (braces keep `$PATH` from joining the marker)', () => {
    const path = readLoginShellPath('/bin/sh')
    expect(path).toBeTruthy()
    expect(path).toContain('/bin')
  })
})
