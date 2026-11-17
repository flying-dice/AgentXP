import { describe, expect, it } from 'vitest'
import { toolGroupOfTitle } from './permissionInterrupt'

describe('toolGroupOfTitle', () => {
  it('finds the permission of an AgentXP tool from the request title', () => {
    expect(toolGroupOfTitle('terminal_run {"command":"npm test"}')).toBe('terminal')
    expect(toolGroupOfTitle('mcp__agentxp__code_edit')).toBe('fs.write')
    expect(toolGroupOfTitle('Edit src/a.ts')).toBeNull()
    expect(toolGroupOfTitle('')).toBeNull()
  })
})
