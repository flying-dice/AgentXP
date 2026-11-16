import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, TOOL_GROUPS } from '@shared/desktop'
import { isDecision, permissionRows, policiesEqual, withDecision } from './permissionsTable'

describe('permissionsTable', () => {
  it('lists the human names in order', () => {
    expect(permissionRows(DEFAULT_TOOL_POLICY).map((r) => r.label)).toEqual([
      'Read files',
      'Write files',
      'Notepad',
      'Code',
      'Terminal',
      'Browser',
      'Paint',
      'WordPad',
      'Notes',
      'Events',
      'Screen capture',
      'Recycle Bin',
      'Agent may open apps'
    ])
  })

  it('has a row for every tool group except shell', () => {
    const keys = permissionRows(DEFAULT_TOOL_POLICY).map((r) => r.key)
    expect(keys.filter((k) => k !== 'openApps').sort()).toEqual(TOOL_GROUPS.filter((g) => g !== 'shell').sort())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('maps decisions of groups and of opening apps', () => {
    const rows = permissionRows(DEFAULT_TOOL_POLICY)
    expect(rows.find((r) => r.key === 'fs.write')?.decision).toBe('ask')
    expect(rows.find((r) => r.key === 'openApps')?.decision).toBe('allow')
  })

  it('changes one decision without touching the original', () => {
    const next = withDecision(withDecision(DEFAULT_TOOL_POLICY, 'terminal', 'deny'), 'openApps', 'ask')
    expect(next.groups.terminal).toBe('deny')
    expect(next.openApps).toBe('ask')
    expect(DEFAULT_TOOL_POLICY.groups.terminal).toBe('ask')
    expect(policiesEqual(next, DEFAULT_TOOL_POLICY)).toBe(false)
    expect(policiesEqual(structuredClone(DEFAULT_TOOL_POLICY), DEFAULT_TOOL_POLICY)).toBe(true)
  })

  it('validates decisions', () => {
    expect(isDecision('ask')).toBe(true)
    expect(isDecision('maybe')).toBe(false)
  })
})
