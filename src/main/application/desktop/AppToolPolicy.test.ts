/** The always-on groups of the apps that manage AgentXP (scheduler_*, profile_*, room_*, settings_*, taskmgr_*, help_*). */
const ADMIN_GROUPS = ['scheduler', 'teams', 'rooms', 'settings', 'taskmgr', 'help'] as const
import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, TOOL_GROUPS, closedAppMessage, enabledToolGroups, type ToolPolicyDto } from '@shared/desktop'
import { PAUSED_MESSAGE, evaluateToolAccess } from './AppToolPolicy'

const state = (over: Partial<{ tools: Parameters<typeof evaluateToolAccess>[0]['state']['tools']; paused: boolean; userInControl: boolean }> = {}) => ({
  tools: enabledToolGroups(['code', 'terminal']),
  paused: false,
  userInControl: false,
  ...over
})
const policy = (patch: Partial<ToolPolicyDto['groups']> = {}): ToolPolicyDto => ({
  ...DEFAULT_TOOL_POLICY,
  groups: { ...DEFAULT_TOOL_POLICY.groups, ...patch }
})

describe('enabledToolGroups (open apps -> tool groups)', () => {
  it('always has the shell group', () => {
    expect(enabledToolGroups([])).toEqual(['shell', 'board', ...ADMIN_GROUPS])
  })

  it('follows the apps that provide each group', () => {
    expect(enabledToolGroups(['explorer'])).toEqual(['shell', 'fs.read', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['notepad'])).toEqual(['shell', 'fs.write', 'notepad', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['code'])).toEqual(['shell', 'fs.read', 'fs.write', 'code', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['terminal', 'browser'])).toEqual(['shell', 'terminal', 'browser', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['chat', 'control-centre', 'agent-manager'])).toEqual(['shell', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['paint', 'sticky-notes'])).toEqual(['shell', 'paint', 'notes', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['wordpad', 'event-viewer'])).toEqual(['shell', 'wordpad', 'events', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['snipping-tool', 'recycle-bin'])).toEqual(['shell', 'snip', 'recycle', 'board', ...ADMIN_GROUPS])
    expect(enabledToolGroups(['code-review'])).toEqual(['shell', 'fs.read', 'board', 'review', ...ADMIN_GROUPS])
  })

  it('ignores order and duplicates, and every group is reachable', () => {
    expect(enabledToolGroups(['browser', 'browser', 'terminal'])).toEqual(enabledToolGroups(['terminal', 'browser']))
    expect(
      enabledToolGroups(['explorer', 'notepad', 'code', 'terminal', 'browser', 'paint', 'wordpad', 'sticky-notes', 'event-viewer', 'snipping-tool', 'recycle-bin', 'code-review', 'diagrams'])
    ).toEqual([...TOOL_GROUPS])
  })
})

describe('evaluateToolAccess', () => {
  it('refuses a group whose app is closed, with the "open the app" hint', () => {
    expect(evaluateToolAccess({ state: state(), group: 'browser', policy: policy() })).toEqual({
      kind: 'refuse',
      message: closedAppMessage('browser')
    })
  })

  it('allows an open app whose policy is allow', () => {
    expect(evaluateToolAccess({ state: state(), group: 'code', policy: policy() })).toEqual({ kind: 'allow' })
  })

  it('asks when the policy says ask, and refuses on deny', () => {
    expect(evaluateToolAccess({ state: state(), group: 'terminal', policy: policy() })).toMatchObject({ kind: 'ask' })
    expect(evaluateToolAccess({ state: state(), group: 'terminal', policy: policy({ terminal: 'deny' }) })).toMatchObject({
      kind: 'refuse',
      message: expect.stringContaining('blocked')
    })
  })

  it('the closed app wins over policy, pause wins over everything', () => {
    expect(evaluateToolAccess({ state: state(), group: 'browser', policy: policy({ browser: 'deny' }) })).toEqual({
      kind: 'refuse',
      message: closedAppMessage('browser')
    })
    expect(evaluateToolAccess({ state: state({ paused: true }), group: 'code', policy: policy() })).toEqual({ kind: 'refuse', message: PAUSED_MESSAGE })
  })

  it('asks for every call while the user is in control', () => {
    expect(evaluateToolAccess({ state: state({ userInControl: true }), group: 'code', policy: policy() })).toMatchObject({ kind: 'ask' })
  })
})
