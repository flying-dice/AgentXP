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
    expect(enabledToolGroups([])).toEqual(['shell'])
  })

  it('follows the apps that provide each group', () => {
    expect(enabledToolGroups(['explorer'])).toEqual(['shell', 'fs.read'])
    expect(enabledToolGroups(['notepad'])).toEqual(['shell', 'fs.write', 'notepad'])
    expect(enabledToolGroups(['code'])).toEqual(['shell', 'fs.read', 'fs.write', 'code'])
    expect(enabledToolGroups(['terminal', 'browser'])).toEqual(['shell', 'terminal', 'browser'])
    expect(enabledToolGroups(['chat', 'control-centre', 'agent-manager'])).toEqual(['shell'])
    expect(enabledToolGroups(['paint', 'sticky-notes'])).toEqual(['shell', 'paint', 'notes'])
    expect(enabledToolGroups(['wordpad', 'event-viewer'])).toEqual(['shell', 'wordpad', 'events'])
    expect(enabledToolGroups(['snipping-tool', 'recycle-bin'])).toEqual(['shell', 'snip', 'recycle'])
  })

  it('ignores order and duplicates, and every group is reachable', () => {
    expect(enabledToolGroups(['browser', 'browser', 'terminal'])).toEqual(enabledToolGroups(['terminal', 'browser']))
    expect(
      enabledToolGroups(['explorer', 'notepad', 'code', 'terminal', 'browser', 'paint', 'wordpad', 'sticky-notes', 'event-viewer', 'snipping-tool', 'recycle-bin'])
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
