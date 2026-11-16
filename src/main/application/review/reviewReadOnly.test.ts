import { describe, expect, it, vi } from 'vitest'
import type { PermissionPrompt, PermissionPrompter } from '../../domain/agent/PermissionPrompter'
import { ToolRefusedError, type ToolGate } from '../../domain/agent/ToolGate'
import { NOT_ALLOWED_IN_REVIEW, readOnlyGate, readOnlyPrompter } from './reviewReadOnly'

const prompt = (toolKind?: 'edit' | 'read' | 'execute'): PermissionPrompt => ({
  sessionKey: 'a',
  toolCallId: 't',
  toolCall: toolKind ? { toolKind } : {},
  options: [
    { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
    { optionId: 'no', name: 'Deny', kind: 'reject_once' }
  ],
  signal: new AbortController().signal
})

describe('readOnlyGate', () => {
  it('refuses writes and commands without asking the user', async () => {
    const inner: ToolGate = { check: vi.fn(async () => {}) }
    for (const group of ['fs.write', 'terminal', 'wordpad'] as const) {
      await expect(readOnlyGate(inner).check('x', { group, title: 'Write' })).rejects.toThrow(new ToolRefusedError(NOT_ALLOWED_IN_REVIEW))
    }
    expect(inner.check).not.toHaveBeenCalled()
  })
  it('lets reads and the review tools through', async () => {
    const inner: ToolGate = { check: vi.fn(async () => {}) }
    await readOnlyGate(inner).check('x', { group: 'fs.read', title: 'Read' })
    await readOnlyGate(inner).check('x', { group: 'review', title: 'Review' })
    expect(inner.check).toHaveBeenCalledTimes(2)
  })
})

describe('readOnlyPrompter', () => {
  it('rejects a writing tool at once and reports it', async () => {
    const inner: PermissionPrompter = { prompt: vi.fn() }
    const refused = vi.fn()
    await expect(readOnlyPrompter(inner, refused).prompt(prompt('edit'))).resolves.toEqual({ outcome: 'selected', optionId: 'no' })
    expect(inner.prompt).not.toHaveBeenCalled()
    expect(refused).toHaveBeenCalledOnce()
  })
  it('passes other requests to the user', async () => {
    const inner: PermissionPrompter = { prompt: vi.fn(async () => ({ outcome: 'cancelled' as const })) }
    await readOnlyPrompter(inner, vi.fn()).prompt(prompt('read'))
    await readOnlyPrompter(inner, vi.fn()).prompt(prompt())
    expect(inner.prompt).toHaveBeenCalledTimes(2)
  })
})
