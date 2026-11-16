import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, TOOL_GROUPS } from '@shared/desktop'
import { isDecision, permissionGroups, permissionRows, policiesEqual, settingTestid, withAllDecisions, withDecision } from './permissionsTable'

describe('permissionsTable', () => {
  it('lists the human names in order, abilities first', () => {
    expect(permissionRows(DEFAULT_TOOL_POLICY).map((r) => r.label)).toEqual([
      'Read files',
      'Write files',
      'Terminal (run commands)',
      'Code',
      'Notepad',
      'Browser',
      'Agent Paint',
      'WordPad',
      'Notes',
      'Events',
      'Screen capture',
      'Recycle Bin',
      'Code review',
      'Agent may open apps'
    ])
  })

  it('splits the rows into the two blocks of the page', () => {
    const groups = permissionGroups(DEFAULT_TOOL_POLICY)
    expect(groups.map((g) => g.title)).toEqual(['What the agent may do', 'Apps the agent may use'])
    expect(groups[0].rows.map((r) => r.key)).toEqual(['fs.read', 'fs.write', 'terminal'])
    expect(groups[1].rows.at(-1)?.key).toBe('openApps')
    expect(groups.flatMap((g) => g.rows)).toHaveLength(14)
  })

  it('sets every permission at once without touching the original', () => {
    const all = withAllDecisions(DEFAULT_TOOL_POLICY, 'deny')
    expect(permissionRows(all).every((r) => r.decision === 'deny')).toBe(true)
    expect(DEFAULT_TOOL_POLICY.groups.terminal).toBe('ask')
    expect(policiesEqual(withAllDecisions(DEFAULT_TOOL_POLICY, 'ask'), DEFAULT_TOOL_POLICY)).toBe(false)
  })

  it('names the test id of a setting box', () => {
    expect(settingTestid('fs.read')).toBe('permissions-setting-fs-read')
    expect(settingTestid('openApps')).toBe('permissions-setting-openApps')
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
