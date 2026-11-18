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

const NO_WINDOW_GROUPS = TOOL_GROUPS.filter((g) => !['browser', 'paint', 'diagrams', 'review'].includes(g))

describe('enabledToolGroups (policy gates the tools; only output apps need their window)', () => {
  it('has every group but the output apps\' with nothing open', () => {
    expect(enabledToolGroups([])).toEqual(NO_WINDOW_GROUPS)
    expect(enabledToolGroups([])).toEqual(expect.arrayContaining(['shell', 'fs.read', 'fs.write', 'terminal', 'notepad', 'show', 'wordpad', 'notes', 'events', 'snip', 'recycle']))
  })

  it('adds an output app\'s group while its window is open', () => {
    expect(enabledToolGroups(['explorer', 'code', 'terminal'])).toEqual(NO_WINDOW_GROUPS)
    expect(enabledToolGroups(['browser'])).toContain('browser')
    expect(enabledToolGroups(['paint'])).toContain('paint')
    expect(enabledToolGroups(['diagrams'])).toContain('diagrams')
    expect(enabledToolGroups(['code-review'])).toContain('review')
    expect(enabledToolGroups(['code-review'])).not.toContain('browser')
  })

  it('ignores order and duplicates, and every group is reachable', () => {
    expect(enabledToolGroups(['browser', 'browser', 'terminal'])).toEqual(enabledToolGroups(['terminal', 'browser']))
    expect(enabledToolGroups(['browser', 'paint', 'code-review', 'diagrams'])).toEqual([...TOOL_GROUPS])
  })
})

describe('evaluateToolAccess', () => {
  it('refuses disabled Teams groups even when policy allows them', () => {
    for (const group of ['teams', 'rooms'] as const) {
      expect(evaluateToolAccess({
        state: state({ tools: enabledToolGroups([]).filter((g) => g !== 'teams' && g !== 'rooms') }),
        group, policy: policy({ teams: 'allow', rooms: 'allow' })
      })).toMatchObject({ kind: 'refuse', message: expect.stringContaining('Teams is disabled') })
    }
  })

  it('refuses a group whose app is closed, with the "open the app" hint', () => {
    expect(evaluateToolAccess({ state: state(), group: 'browser', policy: policy() })).toEqual({
      kind: 'refuse',
      message: closedAppMessage('browser')
    })
  })

  it('never refuses a Work group for a closed app: only the policy decides', () => {
    const nothingOpen = state({ tools: enabledToolGroups([]) })
    expect(evaluateToolAccess({ state: nothingOpen, group: 'fs.read', policy: policy() })).toEqual({ kind: 'allow' })
    expect(evaluateToolAccess({ state: nothingOpen, group: 'terminal', policy: policy() })).toMatchObject({ kind: 'ask' })
    expect(evaluateToolAccess({ state: nothingOpen, group: 'fs.write', policy: policy({ 'fs.write': 'deny' }) })).toMatchObject({ kind: 'refuse', message: expect.stringContaining('blocked') })
  })

  it('allows an open app whose policy is allow', () => {
    expect(evaluateToolAccess({ state: state(), group: 'notepad', policy: policy() })).toEqual({ kind: 'allow' })
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
    expect(evaluateToolAccess({ state: state({ paused: true }), group: 'notepad', policy: policy() })).toEqual({ kind: 'refuse', message: PAUSED_MESSAGE })
  })

  it('asks for every call while the user is in control', () => {
    expect(evaluateToolAccess({ state: state({ userInControl: true }), group: 'notepad', policy: policy() })).toMatchObject({ kind: 'ask' })
  })
})
