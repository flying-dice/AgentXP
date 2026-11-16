import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY } from '@shared/desktop'
import { permissionInterrupt, permissionTurn } from '../app/session/session.fixtures'
import { approvalFromInterrupt, approvalGroup, approvalQuestion, approvalReason } from './approval'

describe('approvals', () => {
  it('builds a pending approval with its tool call', () => {
    const { interrupt, state } = permissionTurn()
    const a = approvalFromInterrupt(3, interrupt, state)
    expect(a).toMatchObject({ key: '3:7', sessionId: 3, title: 'Edit src/auth/redirect.ts', toolKind: 'edit' })
    expect(a?.toolCall?.kind).toBe('edit')
    expect(a?.options.length).toBeGreaterThan(1)
  })
  it('ignores interrupts that are not permission requests', () => {
    expect(approvalFromInterrupt(1, null, null)).toBeNull()
    expect(approvalFromInterrupt(1, { id: 'x', reason: 'other', metadata: {} }, null)).toBeNull()
    expect(approvalFromInterrupt(1, permissionInterrupt('t', 'Run x', 'execute'), null)?.chatTitle).toBe('New chat')
  })
  it('words the question', () => {
    expect(approvalQuestion('Install a new package')).toBe('Do you want to allow the agent to install a new package?')
  })
  it('maps tool kinds to groups', () => {
    expect(approvalGroup('edit')).toBe('fs.write')
    expect(approvalGroup('execute')).toBe('terminal')
    expect(approvalGroup('think')).toBeNull()
    expect(approvalGroup(null)).toBeNull()
  })
  it('explains the reason from the policy when derivable', () => {
    expect(approvalReason('edit', DEFAULT_TOOL_POLICY, false)).toBe('Writing files is set to Ask in Control Centre.')
    expect(approvalReason('execute', DEFAULT_TOOL_POLICY, false)).toBe('Running commands is set to Ask in Control Centre.')
    expect(approvalReason('read', DEFAULT_TOOL_POLICY, false)).toBe('Tool kind: read.')
    expect(approvalReason('edit', null, false)).toBe('Tool kind: edit.')
    expect(approvalReason(null, null, false)).toBe('Tool kind: other.')
    expect(approvalReason('edit', DEFAULT_TOOL_POLICY, true)).toMatch(/in control/)
  })
})
